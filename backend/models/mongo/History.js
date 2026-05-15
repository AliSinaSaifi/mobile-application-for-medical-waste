const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  binId:     { type: String, required: true, trim: true, index: true },
  fullness:  { type: Number, required: true, min: 0, max: 100 },
  timestamp: { type: Date,   default: Date.now },
}, { strict: false });

historySchema.index({ binId: 1, timestamp: -1 });

module.exports = mongoose.model('HistoryNew', historySchema);
