const User = require('../models/User');
const { verifyToken } = require('../utils/auth');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    req.user = User.sanitize(user);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Access denied',
      details: 'Your account role is not allowed to perform this action.'
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize
};
