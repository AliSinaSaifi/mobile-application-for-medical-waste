const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  binId:     { type: String, required: true },
  fullness:  { type: Number, required: true },
  timestamp: { type: Date,   default: Date.now },
}, { strict: false });

module.exports = mongoose.model('HistoryNew', historySchema);