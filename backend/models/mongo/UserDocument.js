const mongoose = require('mongoose');
const { ALL_ROLES, ROLES } = require('../../config/roles');

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 15)
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ALL_ROLES,
      default: ROLES.USER,
      index: true
    }
  },
  {
    collection: 'users',
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
