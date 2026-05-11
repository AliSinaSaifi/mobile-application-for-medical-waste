const router      = require('express').Router();
const Task        = require('../models/pg/Task');
const User        = require('../models/pg/User');
const Container   = require('../models/pg/Container');
const DisposalLog = require('../models/mongo/DisposalLog');
const History     = require('../models/mongo/History');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ── GET /api/utilizer/incoming-tasks ─────────────────────────
// Tasks heading to this utilization point (in_transit)
router.get('/incoming-tasks', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { 
        status: ['in_transit', 'at_utilization'], 
        utilizerId: req.user.userId 
      },
      include: [
        { model: Container, as: 'container' },
        { model: User,      as: 'driver', attributes: ['id', 'email'] },
      ],
      order: [['assignedAt', 'DESC']],
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/utilizer/accept-waste/:taskId ─────────────────
// Utilizer confirms waste arrived → status: at_utilization
router.patch('/accept-waste/:taskId', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.utilizerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not assigned to you' });
    }

    await task.update({ status: 'at_utilization', arrivedAt: new Date() });
    res.json({ message: 'Waste accepted for processing', task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/utilizer/complete-process/:taskId ─────────────
// Utilizer finishes — writes to PostgreSQL + logs to MongoDB
router.patch('/complete-process/:taskId', async (req, res) => {
  try {
    const { weightKg = 0, method = 'incineration', notes = '' } = req.body;

    const task = await Task.findByPk(req.params.taskId, {
      include: [{ model: Container, as: 'container' }],
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });   

    // Добавь сюда:
    if (task.status !== 'at_utilization') {
      return res.status(400).json({ message: 'Accept waste first before completing' });
    }

    // 1. Update task in PostgreSQL
    await task.update({ status: 'completed', completedAt: new Date() });

    // 2. Free up driver and utilizer in PostgreSQL
    await User.update({ isAvailable: true }, { where: { id: task.driverId } });
    await User.update({ isAvailable: true }, { where: { id: task.utilizerId } });

    // 3. Get last telemetry reading from MongoDB
    const lastReading = await History
      .findOne({ binId: task.container?.qrCode })
      .sort({ timestamp: -1 });

    // 4. Write final destruction log to MongoDB
    const log = await DisposalLog.create({
      taskId:      task.id,
      containerId: task.containerId,
      driverId:    task.driverId,
      utilizerId:  task.utilizerId,
      wasteType:   task.container?.wasteType,
      weightKg,
      fullness:    lastReading?.fullness ?? null,
      method,
      notes,
      completedAt: new Date(),
    });

    res.json({
      message: 'Task completed. Disposal log created.',
      task,
      disposalLog: log,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/utilizer/history ─────────────────────────────────
// Completed tasks for this utilizer + matching MongoDB logs
router.get('/history', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { status: 'completed', utilizerId: req.user.userId },
      include: [{ model: Container, as: 'container' }],
      order: [['completedAt', 'DESC']],
      limit: 50,
    });

    // Enrich with MongoDB disposal logs
    const taskIds = tasks.map(t => t.id);
    const logs    = await DisposalLog.find({ taskId: { $in: taskIds } });
    const logsMap = Object.fromEntries(logs.map(l => [l.taskId, l]));

    const result = tasks.map(t => ({
      ...t.toJSON(),
      disposalLog: logsMap[t.id] || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;