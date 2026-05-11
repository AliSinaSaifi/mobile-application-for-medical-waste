const router       = require('express').Router();
const jwt          = require('jsonwebtoken');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    console.log("Notifications request, userId:", req.user.userId);
    const notes = await Notification
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error("Notifications DB error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;