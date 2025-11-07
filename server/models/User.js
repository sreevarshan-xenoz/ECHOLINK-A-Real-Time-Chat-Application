const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email address']
  },
  username: {
    type: String,
    trim: true
  },
  displayName: {
    type: String,
    trim: true
  },
  avatarUrl: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
userSchema.index({ userId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
