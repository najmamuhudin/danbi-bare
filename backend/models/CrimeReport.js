const CrimeReportDocument = require('./mongo/CrimeReportDocument');
const { isMongoConnected } = require('../config/database');
const JsonCollection = require('./local/JsonCollection');

class CrimeReportStore {
  constructor() {
    this.localReports = new JsonCollection('crime-reports.json');
  }

  async createFromPrediction(prediction) {
    if (!prediction?.isCrime) {
      return null;
    }

    const report = {
      _id: Math.random().toString(36).substring(2, 15),
      predictionId: prediction._id,
      inputText: prediction.inputText,
      prediction: prediction.prediction,
      confidence: prediction.confidence,
      user: prediction.user,
      emergencyAlert: prediction.emergencyAlert || null,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMongoConnected()) {
      try {
        const doc = await CrimeReportDocument.create(report);
        return doc.toObject();
      } catch (err) {
        console.warn(`Failed to create MongoDB crime report, using local fallback storage: ${err.message}`);
      }
    }

    return this.localReports.create(report);
  }

  async list({ page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;

    if (isMongoConnected()) {
      const [reports, total] = await Promise.all([
        CrimeReportDocument.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        CrimeReportDocument.countDocuments()
      ]);
      return { reports, total };
    }

    const { items, total } = await this.localReports.list({ page, limit });
    return {
      reports: items,
      total
    };
  }

  async all() {
    if (isMongoConnected()) {
      return CrimeReportDocument.find().sort({ createdAt: -1 }).lean();
    }

    return this.localReports.all();
  }

  async deleteById(id) {
    if (isMongoConnected()) {
      const deleted = await CrimeReportDocument.findByIdAndDelete(id).lean();
      return deleted || null;
    }

    return this.localReports.deleteById(id);
  }
}

module.exports = new CrimeReportStore();
