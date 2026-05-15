const router = require('express').Router();
const axios = require('axios');
const History = require('../models/mongo/History');
const Container = require('../models/pg/Container');
const { getMlConfig } = require('../config/ml');
const { hasValidCoordinates } = require('../utils/containerValidation');

function normalizeStatus(fullness, hasTelemetry) {
  if (!hasTelemetry) return 'UNKNOWN';
  if (fullness >= 85) return 'CRITICAL';
  if (fullness >= 70) return 'WARNING';
  return 'NORMAL';
}

function serializeBin(container, latestReading) {
  const hasTelemetry = Boolean(latestReading);
  const latestFullness = hasTelemetry ? Number(latestReading.fullness) : null;
  const qrCode = String(container.qrCode);

  return {
    id: container.id,
    qrCode,
    locationName: container.location || null,
    lat: Number.isFinite(Number(container.lat)) ? Number(container.lat) : null,
    lon: Number.isFinite(Number(container.lon)) ? Number(container.lon) : null,
    wasteType: container.wasteType || null,
    latestFullness: Number.isFinite(latestFullness) ? latestFullness : null,
    lastUpdated: hasTelemetry ? latestReading.timestamp : null,
    status: normalizeStatus(latestFullness, hasTelemetry),
    _id: qrCode,
    fullness: Number.isFinite(latestFullness) ? latestFullness : null,
    timestamp: hasTelemetry ? latestReading.timestamp : null,
  };
}

function emptyPrediction(binId, note = 'ML service unavailable') {
  return {
    binId,
    predictedHoursToFull: null,
    confidence: null,
    status: 'UNKNOWN',
    estimatedFullTime: null,
    note,
  };
}

function normalizePrediction(binId, payload) {
  if (!payload || typeof payload !== 'object') return null;

  const predictedHoursToFull = payload.predictedHoursToFull;
  const confidence = payload.confidence;
  const status = payload.status;
  const estimatedFullTime = payload.estimatedFullTime;

  if (!['NORMAL', 'WARNING', 'CRITICAL'].includes(status)) return null;

  return {
    binId: payload.binId || binId,
    predictedHoursToFull: Number.isFinite(Number(predictedHoursToFull)) ? Number(predictedHoursToFull) : null,
    confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : null,
    status,
    estimatedFullTime: estimatedFullTime || null,
    note: payload.note || null,
  };
}

function toMlHistoryPoint(item) {
  const fullness = Number(item.fullness);
  const timestamp = new Date(item.timestamp);

  if (!Number.isFinite(fullness) || fullness < 0 || fullness > 100) return null;
  if (Number.isNaN(timestamp.getTime())) return null;

  return {
    timestamp: timestamp.toISOString(),
    fullness,
  };
}

// GET /api/bins - map-ready container metadata with latest telemetry.
router.get('/', async (req, res) => {
  try {
    const containers = await Container.findAll({
      attributes: ['id', 'qrCode', 'location', 'lat', 'lon', 'wasteType'],
      order: [['createdAt', 'ASC']],
    });

    const validContainers = containers.filter((container) => {
      const valid = hasValidCoordinates(container);
      if (!valid) console.warn(`Excluding container with invalid coordinates from /api/bins qrCode=${container.qrCode}`);
      return valid;
    });

    const qrCodes = validContainers.map((container) => String(container.qrCode));
    const latestReadings = qrCodes.length ? await History.aggregate([
        { $match: { binId: { $in: qrCodes }, fullness: { $gte: 0, $lte: 100 } } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$binId', fullness: { $first: '$fullness' }, timestamp: { $first: '$timestamp' } } },
      ]) : [];

    const latestByQr = new Map(latestReadings.map((reading) => [String(reading._id), reading]));
    const bins = validContainers
      .map((container) => {
        const latestReading = latestByQr.get(String(container.qrCode));
        if (!latestReading) {
          console.warn(`Excluding container without telemetry from /api/bins qrCode=${container.qrCode}`);
          return null;
        }
        return serializeBin(container, latestReading);
      })
      .filter(Boolean);

    res.json(bins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bins/history/:binId
router.get('/history/:binId', async (req, res) => {
  try {
    const data = await History
      .find({ binId: req.params.binId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bins/predict/:binId
router.get('/predict/:binId', async (req, res) => {
  try {
    const binId = String(req.params.binId || '').trim();
    const container = await Container.findOne({ where: { qrCode: binId } });
    if (!container || !hasValidCoordinates(container)) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const data = await History
      .find({ binId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const history = data
      .map(toMlHistoryPoint)
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (history.length < 2) {
      return res.json(emptyPrediction(binId, 'Insufficient telemetry history'));
    }

    const mlConfig = getMlConfig();
    if (!mlConfig.enabled) {
      console.warn(`ML prediction disabled for binId=${binId}: ${mlConfig.reason}`);
      return res.json(emptyPrediction(binId, 'ML service unavailable'));
    }

    try {
      const response = await axios.post(
        `${mlConfig.url}/predict`,
        { binId, history },
        {
          timeout: mlConfig.timeoutMs,
          headers: { 'x-internal-service': 'true' },
          transitional: { clarifyTimeoutError: true },
        }
      );

      const prediction = normalizePrediction(binId, response.data);
      if (!prediction) {
        console.warn(`Invalid ML response for binId=${binId}`);
        return res.json(emptyPrediction(binId, 'ML service unavailable'));
      }

      return res.json(prediction);
    } catch (err) {
      console.warn(`ML prediction failed for binId=${binId}: ${err.code || err.message}`);
      return res.json(emptyPrediction(binId, 'ML service unavailable'));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
