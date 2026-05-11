const router   = require('express').Router();
const Driver   = require('../models/pg/Driver');
const User     = require('../models/pg/User');
const Task     = require('../models/pg/Task');
const { authenticate } = require('../middleware/auth');
const { setDriverAvailable } = require('../services/redis');
const { autoAssignUtilizer } = require('../services/autoAssign');

// ── POST /api/drivers/register ────────────────────────────────
router.post('/register', authenticate, async (req, res) => {
  try {
    const {
      licenseNumber, licenseExpiry, company,
      plateNumber, vehicleModel, vehicleYear, capacity,
      emergencyName, emergencyPhone, emergencyRelation,
    } = req.body;

    if (new Date(licenseExpiry) < new Date()) {
      return res.status(400).json({ message: 'Cannot register with an expired license.' });
    }

    const existing = await Driver.findOne({ where: { userId: req.user.userId } });
    if (existing) return res.status(400).json({ message: 'You already have a registration.' });

    const newDriver = await Driver.create({
      userId: req.user.userId,
      licenseNumber,
      licenseExpiry,
      company,
      plateNumber,
      vehicleModel,
      vehicleYear,
      capacity,
      emergencyContact: { name: emergencyName, phone: emergencyPhone, relation: emergencyRelation },
      status: 'pending',
    });

    res.status(201).json({ message: 'Application sent! Waiting for admin approval.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/drivers/my-status ────────────────────────────────
router.get('/my-status', authenticate, async (req, res) => {
  try {
    const driver = await Driver.findOne({ where: { userId: req.user.userId } });
    res.json(driver || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/drivers/tasks ────────────────────────────────────
// Driver sees all their own tasks
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const driver = await Driver.findOne({ where: { userId: req.user.userId } });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    const tasks = await Task.findAll({
      where: { driverId: driver.id },
      order: [['assignedAt', 'DESC']],
    });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/drivers/tasks/:id/status ──────────────────────
// Driver updates task status (assigned → in_transit → completed)
router.patch('/tasks/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['in_transit', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const driver = await Driver.findOne({ where: { userId: req.user.userId } });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    const task = await Task.findOne({
      where: { id: req.params.id, driverId: driver.id },
    });
    if (!task) return res.status(404).json({ message: 'Task not found or not yours' });

    const updates = { status };
    if (status === 'completed') updates.completedAt = new Date();

    await task.update(updates);

    // Когда водитель забрал контейнер — назначить утилизатора
    if (status === 'in_transit') {
      await autoAssignUtilizer(task.id);
    }
    if (status === 'in_transit') {
      console.log(`🔄 Calling autoAssignUtilizer for task ${task.id}`);
     await autoAssignUtilizer(task.id);
    }
    // Free up driver in Redis cache when task is done
    if (status === 'completed' || status === 'cancelled') {
      await User.update({ isAvailable: true }, { where: { id: req.user.userId } });
      await setDriverAvailable(driver.id, true);
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/drivers/availability ──────────────────────────
// Driver toggles their own availability
router.patch('/availability', authenticate, async (req, res) => {
  try {
    const { isAvailable } = req.body;

    await User.update(
      { isAvailable },
      { where: { id: req.user.userId } }
    );

    // Also update Redis cache
    const driver = await Driver.findOne({ where: { userId: req.user.userId } });
    if (driver) await setDriverAvailable(driver.id, isAvailable);

    res.json({ ok: true, isAvailable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;