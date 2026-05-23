const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 15)
    },
    type: {
      type: String,
      enum: ['text', 'url', 'file', 'batch'],
      default: 'text',
      index: true
    },
    inputText: {
      type: String,
      default: ''
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    prediction: {
      type: String,
      default: ''
    },
    isCrime: {
      type: Boolean,
      default: false,
      index: true
    },
    confidence: {
      type: Number,
      default: 0
    },
    crimeProbability: {
      type: Number,
      default: null
    },
    crimeThreshold: {
      type: Number,
      default: null
    },
    processedText: {
      type: String,
      default: ''
    },
    user: {
      id: { type: String, index: true },
      name: String,
      role: String
    },
    scrapedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    segments: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    emergencyAlert: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    modelLoaded: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: 'predictions',
    timestamps: true,
    versionKey: false
  }
);

predictionSchema.index({ createdAt: -1 });
predictionSchema.index({ 'user.id': 1, createdAt: -1 });

module.exports = mongoose.models.Prediction || mongoose.model('Prediction', predictionSchema);
