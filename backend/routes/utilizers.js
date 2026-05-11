const router   = require('express').Router();
const Utilizer = require('../models/pg/Utilizer');
const User     = require('../models/pg/User');
const Notification = require('../models/Notification');
const { authenticate, isAdmin } = require('../middleware/auth');

// ── POST /api/utilizers/register ─────────────────────────────
router.post('/register', authenticate, async (req, res) => {
  try {
    const {
      stationName, stationAddress, stationLat, stationLon,
      licenseNumber, licenseExpiry,
      wasteTypes, capacity, method,
      contactName, contactPhone,
    } = req.body;

    // Validate license not expired
    if (new Date(licenseExpiry) < new Date()) {
      return res.status(400).json({ error: 'License has already expired.' });
    }

    // Check not already registered
    const existing = await Utilizer.findOne({ where: { userId: req.user.userId } });
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted a registration.' });
    }

    const newUtilizer = await Utilizer.create({
      userId: req.user.userId,
      stationName,
      stationAddress,
      stationLat:    stationLat    || null,
      stationLon:    stationLon    || null,
      licenseNumber,
      licenseExpiry,
      wasteTypes:    wasteTypes    || [],
      capacity:      capacity      || null,
      method:        method        || 'incineration',
      contactName:   contactName   || null,
      contactPhone:  contactPhone  || null,
      status: 'pending',
    });

    res.status(201).json({ message: 'Application submitted! Awaiting admin approval.', id: newUtilizer.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/utilizers/my-status ─────────────────────────────
router.get('/my-status', authenticate, async (req, res) => {
  try {
    const utilizer = await Utilizer.findOne({ where: { userId: req.user.userId } });
    res.json(utilizer || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/utilizers/pending (admin) ───────────────────────
router.get('/pending', isAdmin, async (req, res) => {
  try {
    const list = await Utilizer.findAll({
      where: { status: 'pending' },
      include: [{ model: User, as: 'user', attributes: ['email', 'fullName'] }],
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/utilizers/:id/status (admin) ──────────────────
router.patch('/:id/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const utilizer   = await Utilizer.findByPk(req.params.id);
    if (!utilizer) return res.status(404).json({ error: 'Not found' });

    await utilizer.update({ status });

    // Auto-upgrade role on approval
    if (status === 'approved') {
      await User.update({ role: 'utilizer' }, { where: { id: utilizer.userId } });
    }

    // Notify user
    await Notification.create({
      userId:  utilizer.userId,
      title:   status === 'approved' ? 'Station Approved! ♻️' : 'Application Update',
      message: status === 'approved'
        ? `Your station "${utilizer.stationName}" is now active in the MedWaste system.`
        : 'Your utilizer application was declined. Please contact support.',
      type: status === 'approved' ? 'success' : 'error',
    });

    res.json({ message: `Status updated to ${status}`, utilizer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;