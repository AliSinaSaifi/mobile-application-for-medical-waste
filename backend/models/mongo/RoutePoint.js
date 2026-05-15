const mongoose = require('mongoose');

const routePointSchema = new mongoose.Schema({
  routeId:   { type: Number, index: true },
  taskId:    { type: Number, required: true, index: true },
  driverId:  { type: Number, index: true },
  lat:       { type: Number, required: true },
  lon:       { type: Number, required: true },
  speedKph:  { type: Number, default: null },
  heading:   { type: Number, default: null },
  source:    { type: String, default: 'gps' },
  timestamp: { type: Date, default: Date.now, index: true },
}, { collection: 'route_points' });

routePointSchema.index({ taskId: 1, timestamp: 1 });
routePointSchema.index({ routeId: 1, timestamp: 1 });

module.exports = mongoose.model('RoutePoint', routePointSchema);
