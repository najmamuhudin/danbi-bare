const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const UserDocument = require('./mongo/UserDocument');
const { isMongoConnected } = require('../config/database');
const { normalizeRole, ROLE_LABELS, ROLES } = require('../config/roles');

const DATA_PATH = path.join(__dirname, '..', 'data', 'users.json');
const SALT_ROUNDS = 10;

class UserDB {
  constructor() {
    this.users = null;
    this.writeQueue = Promise.resolve();
    this.migrationChecked = false;
  }

  async readJsonUsers() {
    try {
      const raw = await fs.readFile(DATA_PATH, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      return [];
    }
  }

  async ensureMongoSeeded() {
    if (!isMongoConnected() || this.migrationChecked) {
      return;
    }

    const mongoCount = await UserDocument.countDocuments();
    if (mongoCount === 0) {
      const jsonUsers = await this.readJsonUsers();
      if (jsonUsers.length > 0) {
        await UserDocument.insertMany(jsonUsers, { ordered: false });
      }
    }

    this.migrationChecked = true;
  }

  async load() {
    if (this.users) {
      return this.users;
    }

    this.users = await this.readJsonUsers();
    if (!this.users.length) {
      await this.persist();
    }

    return this.users;
  }

  async persist() {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    this.writeQueue = this.writeQueue.then(() => (
      fs.writeFile(DATA_PATH, JSON.stringify(this.users || [], null, 2))
    ));
    return this.writeQueue;
  }

  sanitize(user) {
    if (!user) {
      return null;
    }

    const plainUser = typeof user.toObject === 'function' ? user.toObject() : user;
    const { passwordHash, ...safeUser } = plainUser;
    return {
      ...safeUser,
      _id: String(safeUser._id),
      roleLabel: ROLE_LABELS[safeUser.role] || ROLE_LABELS[ROLES.USER]
    };
  }

  async count() {
    if (isMongoConnected()) {
      await this.ensureMongoSeeded();
      return UserDocument.countDocuments();
    }

    const users = await this.load();
    return users.length;
  }

  async countByRole(role) {
    const normalizedRole = normalizeRole(role);

    if (isMongoConnected()) {
      await this.ensureMongoSeeded();
      return UserDocument.countDocuments({ role: normalizedRole });
    }

    const users = await this.load();
    return users.filter((user) => user.role === normalizedRole).length;
  }

  async findByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (isMongoConnected()) {
      await this.ensureMongoSeeded();
      return UserDocument.findOne({ email: normalizedEmail }).lean();
    }

    const users = await this.load();
    return users.find((user) => user.email === normalizedEmail) || null;
  }

  async findById(id) {
    if (isMongoConnected()) {
      await this.ensureMongoSeeded();
      return UserDocument.findById(id).lean();
    }

    const users = await this.load();
    return users.find((user) => user._id === id) || null;
  }

  async list() {
    if (isMongoConnected()) {
      await this.ensureMongoSeeded();
      const users = await UserDocument.find().sort({ createdAt: -1 }).lean();
      return users.map((user) => this.sanitize(user));
    }

    const users = await this.load();
    return users.map((user) => this.sanitize(user));
  }

  async create({ name, email, password, role }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (isMongoConnected()) {
      await this.ensureMongoSeeded();
      const existing = await UserDocument.findOne({ email: normalizedEmail }).lean();
      if (existing) {
        const error = new Error('Email is already registered');
        error.status = 409;
        throw error;
      }

      const isFirstUser = await UserDocument.countDocuments() === 0;
      const requestedRole = normalizeRole(role);
      const userRole = isFirstUser
        ? ROLES.ADMIN
        : (requestedRole === ROLES.ADMIN ? ROLES.USER : requestedRole);
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await UserDocument.create({
        _id: Math.random().toString(36).substring(2, 15),
        name: String(name || '').trim(),
        email: normalizedEmail,
        passwordHash,
        role: userRole
      });

      return this.sanitize(user);
    }

    const users = await this.load();
    const existing = users.find((user) => user.email === normalizedEmail);

    if (existing) {
      const error = new Error('Email is already registered');
      error.status = 409;
      throw error;
    }

    const isFirstUser = users.length === 0;
    const requestedRole = normalizeRole(role);
    const userRole = isFirstUser
      ? ROLES.ADMIN
      : (requestedRole === ROLES.ADMIN ? ROLES.USER : requestedRole);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();

    const user = {
      _id: Math.random().toString(36).substring(2, 15),
      name: String(name || '').trim(),
      email: normalizedEmail,
      passwordHash,
      role: userRole,
      createdAt: now,
      updatedAt: now
    };

    users.push(user);
    await this.persist();
    return this.sanitize(user);
  }

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateRole(id, role) {
    if (isMongoConnected()) {
      await this.ensureMongoSeeded();
      const user = await UserDocument.findByIdAndUpdate(
        id,
        { role: normalizeRole(role) },
        { new: true }
      );
      return this.sanitize(user);
    }

    const users = await this.load();
    const user = users.find((item) => item._id === id);
    if (!user) {
      return null;
    }

    user.role = normalizeRole(role);
    user.updatedAt = new Date().toISOString();
    await this.persist();
    return this.sanitize(user);
  }

  async deleteById(id) {
    if (isMongoConnected()) {
      await this.ensureMongoSeeded();
      const deleted = await UserDocument.findByIdAndDelete(id).lean();
      return this.sanitize(deleted);
    }

    const users = await this.load();
    const index = users.findIndex((item) => item._id === id);
    if (index === -1) {
      return null;
    }

    const [deleted] = users.splice(index, 1);
    await this.persist();
    return this.sanitize(deleted);
  }
}

module.exports = new UserDB();
