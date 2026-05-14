const router = require('express').Router();
const { Op } = require('sequelize');
const User = require('../models/pg/User');
const { sequelize } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const {
  buildProfileDto,
  validateProfilePayload,
  validatePasswordPayload,
  validatePhoneNumber,
  verifyCurrentPassword,
  hashPassword,
} = require('../services/profile');
const { sendSms } = require('../services/smsService');
const { generateOtpCode, buildFieldsForNewOtp, evaluateOtpVerification } = require('../services/otpService');

router.use(authenticate);

function otpSmsBody(code) {
  return `Your MedWaste verification code is ${code}. It expires in 5 minutes. Do not share this code.`;
}

function mapOtpErrorToResponse(res, err) {
  if (err && err.status && [400, 429].includes(Number(err.status))) {
    const body = { error: err.message };
    if (err.retryAfterSec != null) body.retryAfterSec = err.retryAfterSec;
    return res.status(err.status).json(body);
  }
  return null;
}

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
    return res.status(500).json({ error: 'Request could not be completed' });
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

    await user.reload();

    return res.json({
      ok: true,
      message: 'Profile updated successfully',
      profile: buildProfileDto(user),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Request could not be completed' });
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
    return res.status(500).json({ error: 'Request could not be completed' });
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

    const phoneTrim = phoneNumber.trim();
    const taken = await User.findOne({
      where: { phoneNumber: phoneTrim, id: { [Op.ne]: user.id } },
    });
    if (taken) {
      return res.status(400).json({ error: 'This phone number is already in use' });
    }

    const plainOtp = generateOtpCode();
    const otpFields = await buildFieldsForNewOtp(user, plainOtp);

    try {
      await sendSms(phoneTrim, otpSmsBody(plainOtp));
    } catch (sendErr) {
      const mapped = mapOtpErrorToResponse(res, sendErr);
      if (mapped) return mapped;
      return res.status(503).json({ error: 'Unable to send verification SMS. Try again later.' });
    }

    await user.update({
      phoneNumber: phoneTrim,
      phoneVerified: false,
      ...otpFields,
    });

    return res.json({
      ok: true,
      message: 'Verification code sent',
    });
  } catch (err) {
    const mapped = mapOtpErrorToResponse(res, err);
    if (mapped) return mapped;
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This phone number is already in use' });
    }
    return res.status(500).json({ error: 'Request could not be completed' });
  }
});

// POST /api/profile/phone/verify
router.post('/phone/verify', async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await evaluateOtpVerification(user, code);
    await user.update(result.patch);

    if (result.patch.otpLockedUntil) {
      return res.status(429).json({
        error: 'Too many failed attempts. Try again later.',
        retryAfterSec: Math.ceil((new Date(result.patch.otpLockedUntil) - Date.now()) / 1000),
      });
    }

    if (!result.matches) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    return res.json({ ok: true, message: 'Phone verified successfully' });
  } catch (err) {
    const mapped = mapOtpErrorToResponse(res, err);
    if (mapped) return mapped;
    return res.status(500).json({ error: 'Request could not be completed' });
  }
});

module.exports = router;
