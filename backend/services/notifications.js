const { Server } = require('socket.io');
const User = require('../models/User');
const { DASHBOARD_ROLES, ROLES } = require('../config/roles');
const { verifyToken } = require('../utils/auth');

const RECENT_LIMIT = 50;
const HIGH_RISK_CONFIDENCE_THRESHOLD = Number(process.env.HIGH_RISK_CONFIDENCE_THRESHOLD || 80);

let io = null;
const recentNotifications = [];

const createId = () => Math.random().toString(36).substring(2, 15);

const toSocketUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

const roomForRole = (role) => `role:${role}`;
const roomForUser = (id) => `user:${id}`;

const buildNotification = ({
  type,
  title,
  message,
  severity = 'info',
  payload = {},
  audienceRoles = DASHBOARD_ROLES
}) => ({
  _id: createId(),
  type,
  title,
  message,
  severity,
  payload,
  audienceRoles,
  createdAt: new Date().toISOString()
});

const saveRecent = (notification) => {
  recentNotifications.unshift(notification);
  if (recentNotifications.length > RECENT_LIMIT) {
    recentNotifications.length = RECENT_LIMIT;
  }
  return notification;
};

const canReceive = (notification, user) => (
  notification.audienceRoles?.includes(user?.role)
);

const getSocketToken = (socket) => (
  socket.handshake.auth?.token ||
  socket.handshake.query?.token ||
  String(socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '')
);

const initializeNotifications = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN || '*',
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = getSocketToken(socket);
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyToken(token);
      const user = await User.findById(payload.sub);
      if (!user) {
        return next(new Error('Invalid authentication token'));
      }

      socket.user = User.sanitize(user);
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = toSocketUser(socket.user);
    socket.join(roomForRole(user.role));
    socket.join(roomForUser(user.id));

    socket.emit('notification:ready', {
      connected: true,
      user
    });
    socket.emit(
      'notification:recent',
      recentNotifications.filter((notification) => canReceive(notification, user))
    );
  });

  return io;
};

const emitNotification = (data, audienceRoles = DASHBOARD_ROLES) => {
  const notification = saveRecent(buildNotification({ ...data, audienceRoles }));

  if (io) {
    const rooms = audienceRoles.map(roomForRole);
    io.to(rooms).emit('notification', notification);
  }

  return notification;
};

const emitNewReport = (report) => {
  if (!report) {
    return null;
  }

  return emitNotification({
    type: 'new_report',
    title: 'New report',
    message: `${report.user?.name || 'System'} generated a new crime report`,
    severity: 'danger',
    payload: {
      reportId: report._id,
      predictionId: report.predictionId,
      confidence: report.confidence,
      inputText: String(report.inputText || '').slice(0, 180),
      user: report.user
    }
  });
};

const getHighRiskSegment = (prediction) => {
  const segments = Array.isArray(prediction?.segments) ? prediction.segments : [];
  return segments
    .filter((segment) => Boolean(segment.is_crime) && Number(segment.confidence || 0) >= HIGH_RISK_CONFIDENCE_THRESHOLD)
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0] || null;
};

const getHighRiskConfidence = (prediction) => {
  const predictionConfidence = Number(prediction?.confidence || 0);
  if (prediction?.isCrime && predictionConfidence >= HIGH_RISK_CONFIDENCE_THRESHOLD) {
    return predictionConfidence;
  }

  const segment = getHighRiskSegment(prediction);
  return segment ? Number(segment.confidence || 0) : 0;
};

const emitHighRiskPrediction = (prediction) => {
  const confidence = getHighRiskConfidence(prediction);
  if (!confidence) {
    return null;
  }

  return emitNotification({
    type: 'high_risk_prediction',
    title: 'High-risk prediction',
    message: `${prediction.type} analysis reached ${confidence.toFixed(1)}% crime confidence`,
    severity: 'critical',
    payload: {
      predictionId: prediction._id,
      type: prediction.type,
      confidence,
      inputText: String(prediction.inputText || '').slice(0, 180),
      user: prediction.user
    }
  });
};

const emitSuspiciousActivity = ({ message, ...payload }) => emitNotification({
  type: 'suspicious_activity',
  title: 'Suspicious activity',
  message: message || 'Suspicious activity detected',
  severity: 'warning',
  payload
}, [ROLES.ADMIN]);

const emitPredictionEvents = (prediction, report) => {
  emitNewReport(report);
  emitHighRiskPrediction(prediction);
};

module.exports = {
  emitHighRiskPrediction,
  emitNewReport,
  emitNotification,
  emitPredictionEvents,
  emitSuspiciousActivity,
  initializeNotifications
};
