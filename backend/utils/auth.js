const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-change-this-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const createToken = (user) => jwt.sign(
  {
    sub: user._id,
    email: user.email,
    role: user.role
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = {
  createToken,
  verifyToken
};
