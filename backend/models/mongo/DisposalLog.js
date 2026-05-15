const mongoose = require('mongoose');

// Final destruction record — written when utilizer completes the task
// Stored in MongoDB for analytics, audit trail, and reporting
const disposalLogSchema = new mongoose.Schema({
  taskId:      { type: Number, required: true },   // FK to PostgreSQL Task.id
  containerId: { type: String, required: true },
  driverId:    { type: Number, required: true },
  utilizerId:  { type: Number, required: true },
  wasteType:   { type: String, enum: ['A', 'B', 'C', 'D'] },
  weightKg:    { type: Number, default: 0 },
  fullness:    { type: Number },                   // final fullness % from MongoDB
  method:      { type: String, default: 'incineration' }, // incineration | autoclave | chemical
  notes:       { type: String },
  completedAt: { type: Date, default: Date.now },
}, { collection: 'disposal_logs' });

module.exports = mongoose.model('DisposalLog', disposalLogSchema);
