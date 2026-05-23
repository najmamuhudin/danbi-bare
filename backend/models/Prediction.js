const PredictionDocument = require('./mongo/PredictionDocument');
const CrimeReport = require('./CrimeReport');
const Log = require('./Log');
const EmergencyAlerts = require('../services/emergencyAlerts');
const Notifications = require('../services/notifications');
const { DASHBOARD_ROLES } = require('../config/roles');
const { isMongoConnected } = require('../config/database');
const JsonCollection = require('./local/JsonCollection');

const localPredictions = new JsonCollection('predictions.json');

const isPrivileged = (user) => DASHBOARD_ROLES.includes(user?.role);

const normalizePrediction = (data) => {
  const result = data.result || data.overall || {};
  const input = data.input || {};
  const segments = Array.isArray(data.segments) ? data.segments : [];
  const summary = data.summary || null;
  const crimeSegments = segments.filter((segment) => Boolean(segment.is_crime ?? segment.isCrime));
  const fallbackIsCrime = summary
    ? Number(summary.crime_count || 0) > 0
    : crimeSegments.length > 0;
  const fallbackConfidence = crimeSegments.length > 0
    ? Math.max(...crimeSegments.map((segment) => Number(segment.confidence || 0)))
    : Math.max(0, ...segments.map((segment) => Number(segment.confidence || 0)));
  const inputText = (
    data.inputText ||
    input.text ||
    input.url ||
    input.filename ||
    (input.batch_count ? `${input.batch_count} items (Batch)` : '')
  );

  return {
    _id: data._id || Math.random().toString(36).substring(2, 15),
    type: data.type || 'text',
    inputText: String(inputText || ''),
    input,
    prediction: result.prediction || data.prediction || (fallbackIsCrime ? 'crime-related' : 'not crime-related'),
    isCrime: Boolean(result.is_crime ?? data.isCrime ?? fallbackIsCrime),
    confidence: Number(result.confidence ?? data.confidence ?? fallbackConfidence),
    crimeProbability: result.crime_probability ?? data.crimeProbability ?? null,
    crimeThreshold: result.crime_threshold ?? data.crimeThreshold ?? null,
    processedText: result.processed_text || data.processedText || '',
    user: data.user || null,
    scrapedData: data.scraped_data || data.scrapedData || null,
    segments,
    summary,
    emergencyAlert: data.emergencyAlert || { detected: false, categories: [], matchedKeywords: [] },
    modelLoaded: Boolean(data.modelLoaded),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
};

const toApi = (prediction) => ({
  ...prediction,
  result: {
    prediction: prediction.prediction,
    is_crime: prediction.isCrime,
    confidence: prediction.confidence,
    crime_probability: prediction.crimeProbability,
    crime_threshold: prediction.crimeThreshold,
    processed_text: prediction.processedText
  },
  input: prediction.input,
  scraped_data: prediction.scrapedData
});

class PredictionStore {
  async save(data) {
    const prediction = normalizePrediction(data);
    // Emergency alerts are detected and dispatched from this save path.
    prediction.emergencyAlert = prediction.isCrime
      ? EmergencyAlerts.detectPredictionEmergency(prediction)
      : { detected: false, categories: [], matchedKeywords: [] };
    let saved = prediction;

    if (isMongoConnected()) {
      try {
        const doc = await PredictionDocument.create(prediction);
        saved = doc.toObject();
      } catch (err) {
        console.warn(`Failed to save MongoDB prediction, using local fallback storage: ${err.message}`);
        saved = await localPredictions.create(prediction);
      }
    } else {
      saved = await localPredictions.create(prediction);
    }

    const report = await CrimeReport.createFromPrediction(saved);
    Notifications.emitPredictionEvents(saved, report);
    const emergencyDispatch = await EmergencyAlerts.dispatchEmergencyAlert(saved, report);
    if (emergencyDispatch && saved.emergencyAlert) {
      saved.emergencyAlert.delivery = emergencyDispatch.channels;
    }
    await Log.write({
      action: 'prediction.created',
      message: `${saved.type} prediction stored`,
      user: saved.user,
      meta: {
        predictionId: saved._id,
        prediction: saved.prediction,
        confidence: saved.confidence,
        isCrime: saved.isCrime
      }
    });

    return toApi(saved);
  }

  async list({ page = 1, limit = 20, user = null } = {}) {
    const skip = (page - 1) * limit;
    const query = isPrivileged(user) ? {} : { 'user.id': user?._id };

    if (isMongoConnected()) {
      const [predictions, total] = await Promise.all([
        PredictionDocument.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        PredictionDocument.countDocuments(query)
      ]);
      return {
        predictions: predictions.map(toApi),
        total
      };
    }

    const { items, total } = await localPredictions.list({
      page,
      limit,
      filter: (prediction) => isPrivileged(user) || prediction.user?.id === user?._id
    });
    return {
      predictions: items.map(toApi),
      total
    };
  }

  async stats() {
    if (isMongoConnected()) {
      const [total, crimeCount, byType] = await Promise.all([
        PredictionDocument.countDocuments(),
        PredictionDocument.countDocuments({ isCrime: true }),
        PredictionDocument.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }])
      ]);

      return this.buildStats(total, crimeCount, byType);
    }

    const predictions = await localPredictions.all();
    const total = predictions.length;
    const crimeCount = predictions.filter((prediction) => prediction.isCrime).length;
    const typeCounts = {};
    predictions.forEach((prediction) => {
      typeCounts[prediction.type] = (typeCounts[prediction.type] || 0) + 1;
    });
    const byType = Object.entries(typeCounts).map(([type, count]) => ({ _id: type, count }));
    return this.buildStats(total, crimeCount, byType);
  }

  buildStats(total, crimeCount, byType) {
    const typeStats = {};
    byType.forEach((item) => {
      typeStats[item._id] = item.count;
    });

    return {
      total,
      crime_count: crimeCount,
      not_crime_count: total - crimeCount,
      crime_percentage: total > 0 ? Math.round((crimeCount / total) * 100) : 0,
      by_type: typeStats
    };
  }

  async recent(limit = 7) {
    const { predictions } = await this.list({ page: 1, limit, user: { role: 'admin' } });
    return predictions;
  }

  async findById(id, user = null) {
    let prediction = null;

    if (isMongoConnected()) {
      prediction = await PredictionDocument.findById(id).lean();
    } else {
      prediction = await localPredictions.findById(id);
    }

    if (!prediction) {
      return null;
    }
    if (!isPrivileged(user) && prediction.user?.id !== user?._id) {
      return null;
    }

    return toApi(prediction);
  }
}

module.exports = new PredictionStore();
