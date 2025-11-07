const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register or update user
router.post('/register', async (req, res) => {
  try {
    const { userId, email, username, displayName, avatarUrl } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check if user exists
    let user = await User.findOne({ userId });

    if (user) {
      // Update existing user
      user.email = email || user.email;
      user.username = username || user.username;
      user.displayName = displayName || user.displayName;
      user.avatarUrl = avatarUrl || user.avatarUrl;
      user.lastActive = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        userId,
        email,
        username,
        displayName,
        avatarUrl,
        status: 'online'
      });
      await user.save();
    }

    res.json({ user, success: true });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Get user by ID
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId }).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user status
router.patch('/user/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['online', 'offline', 'away'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findOneAndUpdate(
      { userId },
      { status, lastActive: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user, success: true });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get online users
router.get('/users/online', async (req, res) => {
  try {
    const users = await User.find({ status: 'online' })
      .sort({ lastActive: -1 })
      .lean();

    res.json({ users, count: users.length });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

module.exports = router;
