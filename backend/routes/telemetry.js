const router    = require('express').Router();
const History   = require('../models/mongo/History');
const Alert     = require('../models/Alert');
const Container = require('../models/pg/Container');
const Task      = require('../models/pg/Task');
const { autoAssignDriver }        = require('../services/autoAssign');
const { checkTelemetryRateLimit } = require('../services/redis');
const { sendEmailAlert }          = require('../services/email');
const { emitTelemetry, emitAlert } = require('../services/Socket');
const { Op } = require('sequelize');

// POST /api/telemetry
router.post('/', async (req, res) => {
  try {
    const { binId, fullness } = req.body;
    console.log(`📥 Telemetry received: ${binId} = ${fullness}%`);

    if (!binId || fullness === undefined) {
      return res.status(400).json({ error: 'binId and fullness are required' });
    }

    // Rate limit: max 1 write per binId per 3 seconds
    const allowed = await checkTelemetryRateLimit(binId);
    if (!allowed) return res.status(429).json({ message: 'Rate limited' });

    // Save to MongoDB
    const entry = await new History({ binId, fullness: Number(fullness) }).save();

    // 🔴 Emit real-time update to all clients
    emitTelemetry(binId, Number(fullness), entry.timestamp);

    // Auto-assign driver + create alert if critical (≥80%)
    if (fullness >= 80) {
      // Create alert if not already exists
      console.log(`🔥 Fullness >= 80 triggered for ${binId}`);
      const existingAlert = await Alert.findOne({ containerId: binId, resolved: false });
      console.log(`🔍 Existing alert:`, existingAlert ? 'found' : 'none');
      if (!existingAlert) {
        console.log(`📢 Creating alert for ${binId}`);
        const alert = await Alert.create({
          containerId: binId,
          fullness,
          severity:  'critical',
          title:     `Critical: Container ${binId} is ${fullness}% full`,
          message:   `Container ${binId} has reached ${fullness}% capacity. Immediate collection required.`,
          timestamp: new Date(),
        });
        emitAlert(alert);

        // Send email alert to admin
        await sendEmailAlert(binId, fullness);
      }

      // Auto-assign driver if no active task
     const container = await Container.findOne({ where: { qrCode: binId } });
     console.log(`📦 Container found:`, container ? container.id : 'NOT FOUND');
        if (container) {
          const existing = await Task.findOne({
           where: {
             containerId: binId,
             status: { [Op.in]: ['assigned', 'in_transit', 'at_utilization'] },
         },
       });
           if (!existing) {
             await autoAssignDriver(container.id, fullness);
             console.log(`🚨 Auto-assigned driver for ${binId} at ${fullness}%`);
           }
         }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ Telemetry error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;