const telemetrySchema = new mongoose.Schema({
  containerId: String, // Ссылка на ID из Postgres или QR
  fullness: Number,
  weight: Number,
  timestamp: { type: Date, default: Date.now }
});