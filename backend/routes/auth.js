const express = require('express');
const User = require('../models/User');
const { ALL_ROLES, ROLE_LABELS, ROLES } = require('../config/roles');
const { authenticate, authorize } = require('../middleware/auth');
const { createToken } = require('../utils/auth');
const Log = require('../models/Log');
const Notifications = require('../services/notifications');

const router = express.Router();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const buildSession = (user) => ({
  user,
  token: createToken(user)
});

const getRequestContext = (req, email) => ({
  email: String(email || '').trim().toLowerCase(),
  ip: req.ip,
  userAgent: req.get('user-agent') || 'unknown'
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await User.create({ name, email, password, role });
    await Log.write({
      action: 'auth.register',
      message: 'User registered',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
    res.status(201).json(buildSession(user));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userWithPassword = await User.findByEmail(email);
    if (!userWithPassword) {
      const meta = getRequestContext(req, email);
      await Log.write({
        level: 'warn',
        action: 'auth.login_failed',
        message: 'Unknown email login attempt',
        meta
      });
      Notifications.emitSuspiciousActivity({
        message: 'Failed login attempt for an unknown email',
        reason: 'unknown_email',
        ...meta
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await User.verifyPassword(userWithPassword, password);
    if (!passwordMatches) {
      const meta = getRequestContext(req, email);
      await Log.write({
        level: 'warn',
        action: 'auth.login_failed',
        message: 'Invalid password',
        meta
      });
      Notifications.emitSuspiciousActivity({
        message: 'Failed login attempt with an invalid password',
        reason: 'invalid_password',
        userId: userWithPassword._id,
        ...meta
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = User.sanitize(userWithPassword);
    await Log.write({
      action: 'auth.login',
      message: 'User logged in',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });

    res.json(buildSession(user));
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/me/password
router.patch('/me/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const userWithPassword = await User.findById(req.user._id);
    if (!userWithPassword) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatches = await User.verifyPassword(userWithPassword, currentPassword);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const user = await User.updatePassword(req.user._id, newPassword);
    await Log.write({
      action: 'auth.password_updated',
      message: 'User password updated',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password', details: err.message });
  }
});

// GET /api/auth/roles
router.get('/roles', async (req, res) => {
  const usersCount = await User.count();
  res.json({
    roles: ALL_ROLES.map((value) => ({
      value,
      label: ROLE_LABELS[value]
    })),
    firstUserBecomesAdmin: usersCount === 0
  });
});

// GET /api/auth/users - Admin only
router.get('/users', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  try {
    const users = await User.list();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// PATCH /api/auth/users/:id/role - Admin only
router.patch('/users/:id/role', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  try {
    const nextRole = String(req.body.role || '').trim().toLowerCase();
    if (!ALL_ROLES.includes(nextRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.role === ROLES.ADMIN && nextRole !== ROLES.ADMIN) {
      const adminCount = await User.countByRole(ROLES.ADMIN);
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'At least one admin account is required' });
      }
    }

    const updated = await User.updateRole(req.params.id, nextRole);
    await Log.write({
      action: 'admin.user_role_updated',
      message: 'User role updated',
      user: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        email: req.user.email
      },
      meta: {
        targetUserId: updated._id,
        targetEmail: updated.email,
        previousRole: target.role,
        nextRole: updated.role
      }
    });

    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role', details: err.message });
  }
});

// DELETE /api/auth/users/:id - Admin only
router.delete('/users/:id', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  try {
    if (req.params.id === req.user._id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.role === ROLES.ADMIN) {
      const adminCount = await User.countByRole(ROLES.ADMIN);
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'At least one admin account is required' });
      }
    }

    const deleted = await User.deleteById(req.params.id);
    await Log.write({
      action: 'admin.user_deleted',
      message: 'User account deleted',
      user: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        email: req.user.email
      },
      meta: {
        targetUserId: deleted._id,
        targetEmail: deleted.email,
        targetRole: deleted.role
      }
    });

    res.json({ user: deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});

module.exports = router;
