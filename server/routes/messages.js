const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// Get messages for a direct conversation
router.get('/direct/:userId/:peerId', async (req, res) => {
  try {
    const { userId, peerId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId: peerId },
        { senderId: peerId, recipientId: userId }
      ],
      roomId: null
    })
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json({ messages: messages.reverse(), count: messages.length });
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get messages for a room
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json({ messages: messages.reverse(), count: messages.length });
  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create a new message
router.post('/', async (req, res) => {
  try {
    const { senderId, recipientId, roomId, content, messageType, parentMessageId } = req.body;

    if (!senderId || !content) {
      return res.status(400).json({ error: 'senderId and content are required' });
    }

    if (!recipientId && !roomId) {
      return res.status(400).json({ error: 'Either recipientId or roomId is required' });
    }

    const message = new Message({
      senderId,
      recipientId,
      roomId,
      content,
      messageType: messageType || 'TEXT',
      parentMessageId
    });

    await message.save();

    res.status(201).json({ message, success: true });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Mark message as delivered
router.patch('/:messageId/delivered', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { delivered: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message, success: true });
  } catch (error) {
    console.error('Error marking message as delivered:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Mark message as read
router.patch('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { read: true, delivered: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message, success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Add reaction to message
router.post('/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, emoji } = req.body;

    if (!userId || !emoji) {
      return res.status(400).json({ error: 'userId and emoji are required' });
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $push: {
          reactions: { userId, emoji, timestamp: new Date() }
        }
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message, success: true });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Delete a message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.query;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only allow sender to delete their own messages
    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
