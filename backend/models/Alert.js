const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
 severity:    { type: String, enum: ["critical","warning","info"], default: "info" },
  type:        { type: String, default: "system" },   // fullness | temperature | sensor | system
  title:       { type: String, required: true },
  message:     { type: String, required: true },
  containerId: { type: String, default: "—" },
  location:    { type: String, default: "—" },
  resolved:    { type: Boolean, default: false },
  timestamp:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Alert', alertSchema); 