const mongoose = require('mongoose');

const crimeReportSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 15)
    },
    predictionId: {
      type: String,
      required: true,
      index: true
    },
    inputText: {
      type: String,
      default: ''
    },
    prediction: String,
    confidence: Number,
    user: {
      id: String,
      name: String,
      role: String
    },
    emergencyAlert: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    status: {
      type: String,
      enum: ['new', 'reviewing', 'closed'],
      default: 'new',
      index: true
    }
  },
  {
    collection: 'crime_reports',
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.models.CrimeReport || mongoose.model('CrimeReport', crimeReportSchema);
