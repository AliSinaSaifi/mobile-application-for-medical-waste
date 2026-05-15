const router       = require('express').Router();
const Driver       = require('../models/pg/Driver');
const Task         = require('../models/pg/Task');
const Container    = require('../models/pg/Container');
const Notification = require('../models/Notification');
const { isAdmin }  = require('../middleware/auth');
const User         = require('../models/pg/User');


router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'fullName', 'role', 'isAvailable', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ role });
    res.json({ ok: true, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All admin routes require admin role
router.use(isAdmin);

// GET /api/admin/drivers/pending
router.get('/drivers/pending', async (req, res) => {
  try {
    const drivers = await Driver.findAll({ 
       where: { status: 'pending' },
       include: [{ model: User, as: 'user', attributes: ['email', 'fullName'] }]
     });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/drivers/approved
router.get('/drivers/approved', async (req, res) => {
  try {
    const drivers = await Driver.findAll({ 
      where: { status: 'approved' },
      include: [{ model: User, as: 'user', attributes: ['email', 'fullName'] }]
    });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/drivers/:id/status
router.patch('/drivers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    await driver.update({ status });

    await Notification.create({
      userId:  driver.userId,
      title:   status === 'approved' ? 'Application Approved! 🎉' : 'Application Update',
      message: status === 'approved'
        ? 'Congratulations! You are now an official MedWaste driver.'
        : 'Your application was declined. Please check details.',
      type: status === 'approved' ? 'success' : 'error',
    });

    res.json({ message: `Status updated to ${status}`, driver });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/tasks/all
router.get('/tasks/all', async (req, res) => {
  try {
    const tasks = await Task.findAll({ order: [['assignedAt', 'DESC']] });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/assign-task
router.post('/assign-task', async (req, res) => {
  try {
    const { driverId, containerId } = req.body;

    if (!driverId || !containerId) {
      return res.status(400).json({ error: 'driverId and containerId are required' });
    }

    const normalizedContainerId = String(containerId).trim();

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    if (driver.status !== 'approved') {
      return res.status(400).json({ error: 'Driver is not approved' });
    }

    const container = await Container.findOne({ where: { qrCode: normalizedContainerId } });
    if (!container) {
      return res.status(404).json({ error: 'Container must exist before assigning a task' });
    }

    // Task.driverId references users.id, so use driver's linked userId.
    const newTask = await Task.create({
      driverId: driver.userId,
      containerId: normalizedContainerId,
      status: 'assigned',
    });

    await Notification.create({
      userId:  driver.userId,
      title:   'New Task Assigned! 🚛',
      message: `Container ${normalizedContainerId} is ready for collection.`,
      type:    'info',
    });

    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
