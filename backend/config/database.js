const mongoose = require('mongoose');

const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/crime_detection_system';
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || DEFAULT_MONGO_URI;

mongoose.set('bufferCommands', false);

let lastError = null;

const maskUri = (uri) => uri.replace(/\/\/([^:/?#]+):([^@]+)@/, '//***:***@');

const connectDB = async () => {
  if (process.env.DISABLE_MONGO === 'true') {
    lastError = 'MongoDB disabled with DISABLE_MONGO=true';
    return false;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || 'crime_detection_system',
      serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 4000)
    });
    lastError = null;
    console.log(`MongoDB connected: ${maskUri(MONGO_URI)}`);
    return true;
  } catch (err) {
    lastError = err.message;
    console.warn(`MongoDB unavailable, using local fallback storage: ${err.message}`);
    return false;
  }
};

const isMongoConnected = () => mongoose.connection.readyState === 1;

const dbHealth = () => ({
  type: 'mongodb',
  connected: isMongoConnected(),
  uri: maskUri(MONGO_URI),
  fallback_storage: !isMongoConnected(),
  error: lastError
});

module.exports = {
  connectDB,
  dbHealth,
  isMongoConnected
};
