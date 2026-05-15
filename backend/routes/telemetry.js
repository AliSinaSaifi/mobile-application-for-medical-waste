const router = require('express').Router();
const History = require('../models/mongo/History');
const Alert = require('../models/Alert');
const Container = require('../models/pg/Container');
const Task = require('../models/pg/Task');
const { autoAssignDriver } = require('../services/autoAssign');
const { checkTelemetryRateLimit } = require('../services/redis');
const { sendEmailAlert } = require('../services/email');
const { emitTelemetry, emitAlert } = require('../services/Socket');
const { Op } = require('sequelize');
const { hasValidCoordinates, normalizeQrCode } = require('../utils/containerValidation');

// POST /api/telemetry
router.post('/', async (req, res) => {
  try {
    const binId = normalizeQrCode(req.body.binId);
    const fullness = Number(req.body.fullness);
    console.log(`Telemetry received: ${binId} = ${fullness}%`);

    if (!binId || req.body.fullness === undefined) {
      console.warn('Telemetry rejected: missing binId or fullness');
      return res.status(400).json({ error: 'binId and fullness are required' });
    }

    if (!Number.isFinite(fullness) || fullness < 0 || fullness > 100) {
      console.warn(`Telemetry rejected for qrCode=${binId || 'unknown'}: invalid_fullness value=${req.body.fullness}`);
      return res.status(400).json({ error: 'fullness must be a number between 0 and 100' });
    }

    const container = await Container.findOne({ where: { qrCode: binId } });
    if (!container) {
      console.warn(`Ignoring telemetry for unknown container qrCode=${binId}`);
      return res.status(202).json({ ok: false, ignored: true, reason: 'unknown_container' });
    }

    if (!hasValidCoordinates(container)) {
      console.warn(`Ignoring telemetry for container without valid coordinates qrCode=${binId}`);
      return res.status(202).json({ ok: false, ignored: true, reason: 'invalid_container_coordinates' });
    }

    const allowed = await checkTelemetryRateLimit(binId);
    if (!allowed) {
      console.warn(`Telemetry rejected for qrCode=${binId}: rate_limited`);
      return res.status(429).json({ message: 'Rate limited' });
    }

    const entry = await new History({ binId, fullness }).save();
    emitTelemetry(binId, fullness, entry.timestamp);
    console.log(`Telemetry stored: ${binId} fullness=${fullness} timestamp=${entry.timestamp.toISOString()}`);

    if (fullness >= 80) {
      const existingAlert = await Alert.findOne({ containerId: binId, resolved: false });
      if (!existingAlert) {
        const alert = await Alert.create({
          containerId: binId,
          fullness,
          severity: 'critical',
          title: `Critical: Container ${binId} is ${fullness}% full`,
          message: `Container ${binId} has reached ${fullness}% capacity. Immediate collection required.`,
          timestamp: new Date(),
        });
        emitAlert(alert);
        await sendEmailAlert(binId, fullness);
      }

      const existing = await Task.findOne({
        where: {
          containerId: binId,
          status: { [Op.in]: ['assigned', 'in_transit', 'at_utilization'] },
        },
      });

      if (!existing) {
        await autoAssignDriver(container.id, fullness);
        console.log(`Auto-assigned driver for ${binId} at ${fullness}%`);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telemetry error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
