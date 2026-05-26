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

const THREAT_KEYWORDS = [
  'qarax',
  'argagixiso',
  'afduub',
  'miino',
  'dil',
  'scam',
  'weerar',
  'isqarxin',
  'hub',
  'toorey',
  'bomb',
  'terror',
  'attack',
  'kidnap',
  'weapon',
  'fraud',
  'phish',
  'hate',
  'threat'
];

const normalizeScore = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric > 1 ? numeric : numeric * 100));
};

const detectCrimeCategory = (text = '') => {
  const normalized = text.toLowerCase();
  if (normalized.includes('bomb') || normalized.includes('qarax') || normalized.includes('explosive') || normalized.includes('miino') || normalized.includes('bambo')) {
    return 'Extremism';
  }
  if (normalized.includes('terror') || normalized.includes('argagixiso') || normalized.includes('attack') || normalized.includes('weerar') || normalized.includes('abduct') || normalized.includes('afduub')) {
    return 'Violence';
  }
  if (normalized.includes('scam') || normalized.includes('fraud') || normalized.includes('money') || normalized.includes('invoice') || normalized.includes('lacag')) {
    return 'Fraud';
  }
  if (normalized.includes('hack') || normalized.includes('phish') || normalized.includes('cyber') || normalized.includes('virus')) {
    return 'Cybercrime';
  }
  if (normalized.includes('hate') || normalized.includes('racist') || normalized.includes('heeb') || normalized.includes('faan')) {
    return 'Hate Speech';
  }
  if (normalized.includes('harass') || normalized.includes('bully') || normalized.includes('threat') || normalized.includes('aflagaado')) {
    return 'Harassment';
  }
  return 'General Crime';
};

const getPlatformSource = (prediction) => {
  const text = `${prediction.inputText || ''} ${prediction.input?.url || ''}`.toLowerCase();
  if (text.includes('twitter') || text.includes('t.co') || text.includes('x.com')) return 'Twitter';
  if (text.includes('facebook') || text.includes('fb.com')) return 'Facebook';
  if (text.includes('telegram') || text.includes('t.me')) return 'Telegram';
  if (text.includes('whatsapp') || text.includes('wa.me')) return 'WhatsApp';
  return 'Web Source';
};

const incrementCount = (counts, key, amount = 1) => {
  counts[key] = (counts[key] || 0) + amount;
};

const toCountArray = (counts, limit = null) => {
  const entries = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return limit ? entries.slice(0, limit) : entries;
};

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
    const predictions = await this.all();
    const total = predictions.length;
    const crimeCount = predictions.filter((prediction) => prediction.isCrime).length;
    const typeCounts = {};
    predictions.forEach((prediction) => {
      typeCounts[prediction.type] = (typeCounts[prediction.type] || 0) + 1;
    });
    const byType = Object.entries(typeCounts).map(([type, count]) => ({ _id: type, count }));
    return this.buildStats(total, crimeCount, byType, predictions);
  }

  async all() {
    if (isMongoConnected()) {
      const predictions = await PredictionDocument.find().sort({ createdAt: -1 }).lean();
      return predictions.map(toApi);
    }

    const predictions = await localPredictions.all();
    return predictions.map(toApi);
  }

  buildStats(total, crimeCount, byType, predictions = []) {
    const typeStats = {};
    byType.forEach((item) => {
      typeStats[item._id] = item.count;
    });

    return {
      total,
      crime_count: crimeCount,
      not_crime_count: total - crimeCount,
      crime_percentage: total > 0 ? Math.round((crimeCount / total) * 100) : 0,
      by_type: typeStats,
      analytics: this.buildAnalytics(predictions)
    };
  }

  buildAnalytics(predictions = []) {
    const categoryCounts = {};
    const platformCounts = {};
    const keywordCounts = {};
    const subjects = new Map();
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - offset));
      const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), count: 0 };
    });
    const trendByKey = new Map(days.map((day) => [day.key, day]));

    predictions.forEach((prediction) => {
      const text = String(prediction.inputText || prediction.input?.text || prediction.input?.url || '');
      const normalizedText = text.toLowerCase();
      const category = detectCrimeCategory(text);
      const platform = getPlatformSource(prediction);
      const threatScore = normalizeScore(prediction.crimeProbability ?? prediction.crime_probability ?? prediction.confidence);

      incrementCount(categoryCounts, category);
      incrementCount(platformCounts, platform);

      if (prediction.isCrime) {
        const createdAt = new Date(prediction.createdAt);
        if (Number.isFinite(createdAt.getTime())) {
          const trendDay = trendByKey.get(createdAt.toISOString().slice(0, 10));
          if (trendDay) trendDay.count += 1;
        }

        const keywords = [
          ...(prediction.emergencyAlert?.matchedKeywords || []),
          ...THREAT_KEYWORDS.filter((keyword) => normalizedText.includes(keyword))
        ];
        [...new Set(keywords)].forEach((keyword) => incrementCount(keywordCounts, keyword));
      }

      if (prediction.isCrime || threatScore >= 60) {
        const key = prediction.user?.id || prediction.user?.name || prediction.input?.url || 'unattributed-source';
        const current = subjects.get(key) || {
          id: key,
          name: prediction.user?.name || prediction.input?.url || 'Unattributed source',
          handle: prediction.user?.role || prediction.type || 'source',
          riskScore: 0,
          matches: 0,
          platform,
          lastSignalAt: prediction.createdAt
        };
        current.matches += 1;
        current.riskScore = Math.max(current.riskScore, threatScore);
        current.lastSignalAt = new Date(prediction.createdAt) > new Date(current.lastSignalAt) ? prediction.createdAt : current.lastSignalAt;
        current.status = current.riskScore >= 85 ? 'Flagged' : current.riskScore >= 70 ? 'Under Review' : 'Monitored';
        current.activity = current.matches >= 5 ? 'High' : current.matches >= 2 ? 'Medium' : 'Low';
        subjects.set(key, current);
      }
    });

    return {
      categories: toCountArray(categoryCounts),
      platforms: toCountArray(platformCounts),
      keywords: toCountArray(keywordCounts, 12).map((item) => ({
        word: item.name,
        count: item.count,
        weight: item.count >= 5 ? 'high' : item.count >= 2 ? 'mid' : 'low'
      })),
      trend: days,
      high_risk_subjects: [...subjects.values()].sort((a, b) => b.riskScore - a.riskScore).slice(0, 12)
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
