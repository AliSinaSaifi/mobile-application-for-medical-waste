const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/pg/User');
const { sequelize } = require('../config/db');
const { saveSession, deleteSession } = require('../services/redis');
const { authenticate } = require('../middleware/auth');
const { validateProfilePayload } = require('../services/profile');

const SECRET = process.env.JWT_SECRET || 'supersecretkey';
const REDIS_ENABLED = ['1', 'true', 'yes', 'on'].includes(String(process.env.ENABLE_REDIS ?? 'true').toLowerCase());

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, username, email, password, role } = req.body;

    if (!email || !password || !username || !fullName) {
      return res.status(400).json({ error: 'Full name, username, email and password are required' });
    }

    const validationError = validateProfilePayload({ fullName, username, department: '' });
    if (validationError) return res.status(400).json({ error: validationError });

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) return res.status(400).json({ error: 'User with this email already exists' });

    const existingUser = await User.findOne({ where: sequelize.where(sequelize.fn('lower', sequelize.col('username')), username.trim().toLowerCase()) });
    if (existingUser) return res.status(400).json({ error: 'Username is already taken' });

    const hashed = await bcrypt.hash(password, 10);

    // Only allow safe roles on self-register
    const safeRole = ['admin', 'personnel', 'driver', 'utilizer'].includes(role)
      ? role
      : 'personnel'; // default role

    const newUser = await User.create({
      fullName: fullName.trim(),
      username: username.trim(),
      email,
      password: hashed,
      role: safeRole,
    });

    res.status(201).json({ ok: true, message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user)         return res.status(400).json({ error: 'User not found' });
    if (!user.password) return res.status(400).json({ error: 'Password not set. Contact admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Sign JWT with role
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, fullName: user.fullName, username: user.username },
      SECRET,
      { expiresIn: '7d' }
    );

    if (REDIS_ENABLED) {
      try {
        await saveSession(user.id, token);
      } catch (redisErr) {
        console.warn('⚠️ Redis session save skipped:', redisErr.message);
      }
    }

    res.json({
      token,
      email:    user.email,
      fullName: user.fullName,
      username: user.username,
      role:     user.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (REDIS_ENABLED) {
      try {
        await deleteSession(req.user.userId);
      } catch (redisErr) {
        console.warn('⚠️ Redis session delete skipped:', redisErr.message);
      }
    }
    res.json({ ok: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: [
        'id',
        'email',
        'fullName',
        'username',
        'role',
        'isAvailable',
        'department',
        'phoneNumber',
        'phoneVerified',
        'createdAt',
      ],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;