const LogDocument = require('./mongo/LogDocument');
const { isMongoConnected } = require('../config/database');
const JsonCollection = require('./local/JsonCollection');

class LogStore {
  constructor() {
    this.localLogs = new JsonCollection('logs.json');
  }

  async write({ level = 'info', action, message = '', user = null, meta = {} }) {
    const payload = {
      _id: Math.random().toString(36).substring(2, 15),
      level,
      action,
      message,
      user,
      meta,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMongoConnected()) {
      try {
        const doc = await LogDocument.create(payload);
        return doc.toObject();
      } catch (err) {
        console.warn(`Failed to write MongoDB log, using local fallback storage: ${err.message}`);
      }
    }

    return this.localLogs.create(payload);
  }

  async list({ page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;

    if (isMongoConnected()) {
      const [logs, total] = await Promise.all([
        LogDocument.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        LogDocument.countDocuments()
      ]);
      return { logs, total };
    }

    const { items, total } = await this.localLogs.list({ page, limit });
    return {
      logs: items,
      total
    };
  }
}

module.exports = new LogStore();
