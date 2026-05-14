const router = require('express').Router();
const User = require('../models/pg/User');
const { sequelize } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const {
  buildProfileDto,
  validateProfilePayload,
  validatePasswordPayload,
  validatePhoneNumber,
  generateVerificationCode,
  hashVerificationCode,
  verifyCurrentPassword,
  hashPassword,
} = require('../services/profile');

router.use(authenticate);

// GET /api/profile
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: [
        'id',
        'email',
        'fullName',
        'username',
        'role',
        'department',
        'phoneNumber',
        'phoneVerified',
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(buildProfileDto(user));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile
router.patch('/', async (req, res) => {
  try {
    const { fullName, username, department } = req.body;

    const validationError = validateProfilePayload({ fullName, username, department });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check username uniqueness (case-insensitive)
    if (username && username.trim()) {
      const existing = await User.findOne({
        where: sequelize.where(sequelize.fn('lower', sequelize.col('username')), username.trim().toLowerCase()),
      });
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    await user.update({
      fullName: fullName.trim(),
      username: username.trim(),
      department: typeof department === 'string' ? department.trim() : '',
    });

    return res.json({
      ok: true,
      message: 'Profile updated successfully',
      profile: buildProfileDto(user),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile/password
router.patch('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const validationError = validatePasswordPayload({ currentPassword, newPassword, confirmPassword });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentPasswordValid = await verifyCurrentPassword(user, currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await user.update({ password: hashedPassword });

    return res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/phone/send-code
router.post('/phone/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    const validationError = validatePhoneNumber(phoneNumber);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const code = generateVerificationCode();
    const ttlMinutes = Number(process.env.PHONE_VERIFICATION_TTL_MINUTES || 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await user.update({
      phoneNumber: phoneNumber.trim(),
      phoneVerified: false,
      phoneVerificationCodeHash: hashVerificationCode(code),
      phoneVerificationExpiresAt: expiresAt,
    });

    // Placeholder delivery hook while real SMS provider is not configured.
    console.log(`📱 Phone verification code for user ${user.id}: ${code}`);

    const payload = {
      ok: true,
      message: 'Verification code sent',
    };

    if (String(process.env.PHONE_VERIFICATION_DEBUG || '').toLowerCase() === 'true') {
      payload.debugCode = code;
    }

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/phone/verify
router.post('/phone/verify', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json({ error: 'Verification code must be 6 digits' });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.phoneVerificationCodeHash || !user.phoneVerificationExpiresAt) {
      return res.status(400).json({ error: 'No verification request found. Send code first.' });
    }

    if (new Date(user.phoneVerificationExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Verification code expired. Send a new code.' });
    }

    const matches = hashVerificationCode(code.trim()) === user.phoneVerificationCodeHash;
    if (!matches) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await user.update({
      phoneVerified: true,
      phoneVerificationCodeHash: null,
      phoneVerificationExpiresAt: null,
    });

    return res.json({ ok: true, message: 'Phone verified successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
