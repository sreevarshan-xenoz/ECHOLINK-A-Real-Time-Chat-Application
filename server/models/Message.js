const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
    trim: true
  },
  recipientId: {
    type: String,
    trim: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['TEXT', 'FILE', 'CODE', 'VOICE', 'IMAGE', 'VIDEO'],
    default: 'TEXT'
  },
  parentMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  delivered: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  },
  reactions: [{
    userId: String,
    emoji: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure either recipientId or roomId is set
messageSchema.pre('save', function(next) {
  if (!this.recipientId && !this.roomId) {
    next(new Error('Either recipientId or roomId must be provided'));
  } else if (this.recipientId && this.roomId) {
    next(new Error('Cannot have both recipientId and roomId'));
  } else {
    next();
  }
});

// Indexes for faster queries
messageSchema.index({ senderId: 1, timestamp: -1 });
messageSchema.index({ recipientId: 1, timestamp: -1 });
messageSchema.index({ roomId: 1, timestamp: -1 });
messageSchema.index({ timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
