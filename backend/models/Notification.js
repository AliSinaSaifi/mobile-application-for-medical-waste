const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  title: String,
  message: String,
  type: { type: String, enum: ['success', 'error', 'info'], default: 'info' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);