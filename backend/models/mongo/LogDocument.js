const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 15)
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error'],
      default: 'info',
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    message: {
      type: String,
      default: ''
    },
    user: {
      id: String,
      name: String,
      role: String,
      email: String
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    collection: 'logs',
    timestamps: true,
    versionKey: false
  }
);

logSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Log || mongoose.model('Log', logSchema);
