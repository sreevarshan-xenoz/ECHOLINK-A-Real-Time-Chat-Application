const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Get all rooms for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const rooms = await Room.find({
      'members.userId': userId
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ rooms, count: rooms.length });
  } catch (error) {
    console.error('Error fetching user rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get room details
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId).lean();

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Create a new room
router.post('/', async (req, res) => {
  try {
    const { name, createdBy, members, isPrivate } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({ error: 'name and createdBy are required' });
    }

    // Ensure creator is in members list with admin role
    const membersList = members || [];
    const creatorInMembers = membersList.find(m => m.userId === createdBy);
    
    if (!creatorInMembers) {
      membersList.push({
        userId: createdBy,
        role: 'admin',
        joinedAt: new Date()
      });
    } else {
      creatorInMembers.role = 'admin';
    }

    const room = new Room({
      name,
      createdBy,
      members: membersList,
      isPrivate: isPrivate || false
    });

    await room.save();

    res.status(201).json({ room, success: true });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Add member to room
router.post('/:roomId/members', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is already a member
    const existingMember = room.members.find(m => m.userId === userId);
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    room.members.push({
      userId,
      role: role || 'member',
      joinedAt: new Date()
    });

    await room.save();

    res.json({ room, success: true });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from room
router.delete('/:roomId/members/:userId', async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    room.members = room.members.filter(m => m.userId !== userId);

    await room.save();

    res.json({ room, success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Get room members
router.get('/:roomId/members', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId).lean();

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ members: room.members, count: room.members.length });
  } catch (error) {
    console.error('Error fetching room members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Delete a room
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.query;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only allow creator to delete room
    if (room.createdBy !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this room' });
    }

    await Room.findByIdAndDelete(roomId);

    res.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

module.exports = router;
