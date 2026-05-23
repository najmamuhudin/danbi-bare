const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
require('dotenv').config();

const analyzeRoutes = require('./routes/analyze');
const authRoutes = require('./routes/auth');
const twilioRoutes = require('./routes/twilio');
const { connectDB, dbHealth } = require('./config/database');
const { initializeNotifications } = require('./services/notifications');

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:5000';

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`Invalid PORT value "${process.env.PORT}". Use a number between 1 and 65535.`);
  process.exit(1);
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/twilio', twilioRoutes);

// Public model metadata for the landing page and trust indicators.
app.get('/api/model/info', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API}/api/model/info`, { timeout: 5000 });
    res.json(response.data);
  } catch (err) {
    res.status(503).json({
      model_loaded: false,
      model_error: err.response?.data?.error || err.message,
      python_api: PYTHON_API
    });
  }
});

// Health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    message: 'Backend API is running',
    python_api: PYTHON_API,
    database: dbHealth(),
    model_service: {
      reachable: false,
      model_loaded: false
    }
  };

  try {
    const response = await axios.get(`${PYTHON_API}/health`, { timeout: 3000 });
    health.model_service = {
      reachable: true,
      ...response.data
    };
  } catch (err) {
    health.model_service.error = err.response?.data?.error || err.message;
  }

  res.json(health);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

const startServer = async () => {
  await connectDB();
  initializeNotifications(server);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      console.error(`Stop the process using it, or set a different PORT in backend/.env.`);
      console.error(`Example: PORT=4001`);
      process.exit(1);
    }

    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using Python model API at ${PYTHON_API}`);
    console.log('Socket.io notifications enabled');
  });
};

startServer();
