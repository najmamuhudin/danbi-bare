const Notifications = require('./notifications');
const Log = require('../models/Log');

const ALERT_CATEGORIES = [
  {
    id: 'bomb_threat',
    label: 'Hanjabaad qarax',
    severity: 'critical',
    keywords: ['bomb', 'explosive', 'blast', 'detonate', 'ied', 'qarax', 'miino', 'bambo', 'walxaha qarxa', 'is qarxin']
  },
  {
    id: 'terror_threat',
    label: 'Hanjabaad argagixiso',
    severity: 'critical',
    keywords: ['terror', 'terrorist', 'attack', 'massacre', 'hostage', 'weerar', 'argagixiso', 'xasuuq', 'qarxin']
  },
  {
    id: 'kidnapping',
    label: 'Afduub',
    severity: 'critical',
    keywords: ['kidnap', 'kidnapping', 'abduct', 'abduction', 'hostage', 'afduub', 'la afduubay', 'qafaal', 'qafaashay', 'la qafaashay']
  },
  {
    id: 'suicide_threat',
    label: 'Hanjabaad is-dilid',
    severity: 'critical',
    keywords: ['suicide', 'self harm', 'kill myself', 'end my life', 'is dil', 'isdil', 'waan is dilayaa', 'naftayda ayaan dilayaa']
  },
  {
    id: 'weapon_threat',
    label: 'Hanjabaad hub',
    severity: 'danger',
    keywords: ['gun', 'shoot', 'shooting', 'weapon', 'knife', 'pistol', 'rifle', 'qori', 'hub', 'toorey', 'bastoolad', 'xabad', 'rasaas', 'mindid']
  }
];

const truthyEnv = (name, fallback = false) => {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return !['false', '0', 'no', 'off'].includes(String(value).trim().toLowerCase());
};

const emergencyAlertsEnabled = () => truthyEnv('EMERGENCY_ALERTS_ENABLED', true);

const disabledAlert = () => ({
  detected: false,
  categories: [],
  matchedKeywords: [],
  disabled: true,
  checkedAt: new Date().toISOString()
});

const splitList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const addValue = (parts, value) => {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    parts.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => addValue(parts, item));
    return;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => addValue(parts, item));
  }
};

const collectPredictionText = (prediction) => {
  const parts = [];
  [
    prediction?.inputText,
    prediction?.processedText,
    prediction?.input,
    prediction?.scrapedData,
    prediction?.segments,
    prediction?.summary
  ].forEach((value) => addValue(parts, value));

  return parts.join(' ').toLowerCase();
};

const findMatches = (text, keywords) => (
  keywords.filter((keyword) => text.includes(keyword.toLowerCase()))
);

const unique = (items) => [...new Set(items.filter(Boolean))];

const detectPredictionEmergency = (prediction = {}) => {
  if (!emergencyAlertsEnabled()) {
    return disabledAlert();
  }

  const text = collectPredictionText(prediction);
  const categories = ALERT_CATEGORIES
    .map((category) => ({
      id: category.id,
      label: category.label,
      severity: category.severity,
      matchedKeywords: findMatches(text, category.keywords)
    }))
    .filter((category) => category.matchedKeywords.length > 0);

  const matchedKeywords = unique(categories.flatMap((category) => category.matchedKeywords));

  return {
    detected: categories.length > 0,
    categories,
    matchedKeywords,
    severity: categories.some((category) => category.severity === 'critical') ? 'critical' : 'danger',
    checkedAt: new Date().toISOString()
  };
};

const buildMessage = (prediction, report) => {
  const alert = prediction.emergencyAlert || {};
  const labels = alert.categories?.map((category) => category.label).join(', ') || 'Emergency';
  const confidence = Number(prediction.confidence || 0).toFixed(1);
  const snippet = String(prediction.inputText || '').replace(/\s+/g, ' ').slice(0, 180);
  return `${labels} detected (${confidence}% confidence). Report: ${report?._id || 'pending'}. ${snippet}`;
};

const sendSmsAlerts = async (message) => {
  const recipients = splitList(process.env.EMERGENCY_ALERT_PHONES);
  if (!truthyEnv('EMERGENCY_ALERT_SMS_ENABLED') || recipients.length === 0) {
    return { enabled: false, skipped: true, reason: 'SMS alerts are not configured' };
  }

  const hasSender = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !hasSender) {
    return { enabled: true, skipped: true, reason: 'Twilio credentials or sender are missing' };
  }

  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const basePayload = {
    body: message.slice(0, 1500)
  };

  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    basePayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  } else {
    basePayload.from = process.env.TWILIO_FROM_NUMBER;
  }

  if (process.env.TWILIO_STATUS_CALLBACK_URL) {
    basePayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
  }

  const results = [];
  for (const to of recipients) {
    try {
      const sent = await client.messages.create({ ...basePayload, to });
      results.push({ to, status: sent.status, sid: sent.sid });
    } catch (err) {
      results.push({ to, status: 'failed', error: err.message });
    }
  }

  return { enabled: true, skipped: false, results };
};

const sendEmailAlerts = async (message, prediction) => {
  const recipients = splitList(process.env.EMERGENCY_ALERT_EMAILS);
  if (!truthyEnv('EMERGENCY_ALERT_EMAIL_ENABLED') || recipients.length === 0) {
    return { enabled: false, skipped: true, reason: 'Email alerts are not configured' };
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { enabled: true, skipped: true, reason: 'SMTP credentials are missing' };
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: truthyEnv('SMTP_SECURE'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    const sent = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients,
      subject: 'CrimeWatch emergency alert',
      text: `${message}\n\nInput:\n${String(prediction.inputText || '').slice(0, 1000)}`
    });
    return { enabled: true, skipped: false, messageId: sent.messageId, accepted: sent.accepted };
  } catch (err) {
    return { enabled: true, skipped: false, error: err.message };
  }
};

const dispatchEmergencyAlert = async (prediction, report) => {
  if (!emergencyAlertsEnabled()) {
    return { disabled: true, channels: null };
  }

  const alert = prediction?.emergencyAlert;
  if (!alert?.detected) {
    return null;
  }

  const message = buildMessage(prediction, report);
  const categoryLabels = alert.categories?.map((category) => category.label) || [];
  const channels = {
    socket: null,
    sms: null,
    email: null
  };

  channels.socket = Notifications.emitNotification({
    type: 'emergency_alert',
    title: 'Emergency alert',
    message,
    severity: 'critical',
    payload: {
      predictionId: prediction._id,
      reportId: report?._id || null,
      categories: categoryLabels,
      matchedKeywords: alert.matchedKeywords || [],
      inputText: String(prediction.inputText || '').slice(0, 180),
      user: prediction.user || null
    }
  });

  const [sms, email] = await Promise.all([
    sendSmsAlerts(message),
    sendEmailAlerts(message, prediction)
  ]);
  channels.sms = sms;
  channels.email = email;

  await Log.write({
    level: 'warn',
    action: 'emergency_alert.detected',
    message,
    user: prediction.user || null,
    meta: {
      predictionId: prediction._id,
      reportId: report?._id || null,
      categories: categoryLabels,
      matchedKeywords: alert.matchedKeywords || [],
      channels
    }
  });

  return { channels };
};

const getEmergencyAlertStatus = () => {
  const smsRecipients = splitList(process.env.EMERGENCY_ALERT_PHONES);
  const emailRecipients = splitList(process.env.EMERGENCY_ALERT_EMAILS);
  const smsSender = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID;

  return {
    pipeline: {
      enabled: emergencyAlertsEnabled()
    },
    sms: {
      enabled: truthyEnv('EMERGENCY_ALERT_SMS_ENABLED'),
      configured: Boolean(
        smsRecipients.length &&
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        smsSender
      ),
      recipients: smsRecipients.length
    },
    email: {
      enabled: truthyEnv('EMERGENCY_ALERT_EMAIL_ENABLED'),
      configured: Boolean(
        emailRecipients.length &&
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ),
      recipients: emailRecipients.length
    }
  };
};

module.exports = {
  detectPredictionEmergency,
  dispatchEmergencyAlert,
  emergencyAlertsEnabled,
  getEmergencyAlertStatus
};
