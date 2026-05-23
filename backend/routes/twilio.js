const express = require('express');
const { validateRequest } = require('twilio');
const Log = require('../models/Log');

const router = express.Router();

const truthyEnv = (name, fallback = true) => {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return !['false', '0', 'no', 'off'].includes(String(value).trim().toLowerCase());
};

const getPublicUrl = (req) => {
  const configuredBaseUrl = String(process.env.TWILIO_WEBHOOK_BASE_URL || '').replace(/\/+$/, '');
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}${req.originalUrl}`;
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${req.get('host')}${req.originalUrl}`;
};

const verifyTwilioRequest = (req, res, next) => {
  if (!truthyEnv('TWILIO_VALIDATE_WEBHOOKS', true)) {
    return next();
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    return res.status(500).json({ error: 'TWILIO_AUTH_TOKEN is required for webhook validation' });
  }

  const signature = req.headers['x-twilio-signature'];
  const isValid = validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    getPublicUrl(req),
    req.body
  );

  if (!isValid) {
    return res.status(403).json({ error: 'Invalid Twilio signature' });
  }

  return next();
};

router.post('/status', verifyTwilioRequest, async (req, res) => {
  const {
    MessageSid,
    SmsSid,
    MessageStatus,
    SmsStatus,
    ErrorCode,
    ErrorMessage,
    To,
    From,
    AccountSid
  } = req.body;

  const messageSid = MessageSid || SmsSid;
  const status = MessageStatus || SmsStatus || 'unknown';
  const level = ['failed', 'undelivered'].includes(status) ? 'error' : 'info';

  await Log.write({
    level,
    action: 'twilio.message.status',
    message: `Twilio message ${messageSid || 'unknown'} is ${status}`,
    meta: {
      messageSid,
      status,
      errorCode: ErrorCode || null,
      errorMessage: ErrorMessage || null,
      to: To || null,
      from: From || null,
      accountSid: AccountSid || null,
      raw: req.body
    }
  });

  return res.sendStatus(204);
});

module.exports = router;
