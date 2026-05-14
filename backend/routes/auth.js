const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/pg/User');
const { sequelize } = require('../config/db');
const { saveSession, deleteSession } = require('../services/redis');
const { authenticate } = require('../middleware/auth');
const { validateProfilePayload, validatePhoneNumber } = require('../services/profile');
const { sendSms } = require('../services/smsService');
const {
  generateOtpCode,
  buildFieldsForNewOtp,
  evaluateOtpVerification,
} = require('../services/otpService');

const SECRET = process.env.JWT_SECRET || 'supersecretkey';
const REDIS_ENABLED = ['1', 'true', 'yes', 'on'].includes(String(process.env.ENABLE_REDIS ?? 'true').toLowerCase());

function mapOtpErrorToResponse(res, err) {
  if (err && err.status && [400, 429].includes(Number(err.status))) {
    const body = { error: err.message };
    if (err.retryAfterSec != null) body.retryAfterSec = err.retryAfterSec;
    return res.status(err.status).json(body);
  }
  return null;
}

function otpSmsBody(code) {
  return `Your MedWaste verification code is ${code}. It expires in 5 minutes. Do not share this code.`;
}

/** When E2E_INCLUDE_TWILIO_SID=1, attach Twilio metadata for integration tests only (never the OTP). */
function withOptionalTwilioMeta(body, twilioResult) {
  if (process.env.E2E_INCLUDE_TWILIO_SID !== '1' || !twilioResult?.sid) return body;
  return {
    ...body,
    twilioMessageSid: twilioResult.sid,
    twilioMessageStatus: twilioResult.status ?? null,
  };
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, username, email, phoneNumber, password, role } = req.body;

    if (!email || !password || !username || !fullName || !phoneNumber) {
      return res.status(400).json({
        error: 'Full name, username, email, phone number (E.164), and password are required',
      });
    }

    const phoneErr = validatePhoneNumber(phoneNumber);
    if (phoneErr) return res.status(400).json({ error: phoneErr });

    const validationError = validateProfilePayload({ fullName, username, department: '' });
    if (validationError) return res.status(400).json({ error: validationError });

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) return res.status(400).json({ error: 'User with this email already exists' });

    const existingUser = await User.findOne({
      where: sequelize.where(sequelize.fn('lower', sequelize.col('username')), username.trim().toLowerCase()),
    });
    if (existingUser) return res.status(400).json({ error: 'Username is already taken' });

    const phoneTrim = phoneNumber.trim();
    const existingPhone = await User.findOne({ where: { phoneNumber: phoneTrim } });
    if (existingPhone) return res.status(400).json({ error: 'This phone number is already registered' });

    const hashed = await bcrypt.hash(password, 10);

    const safeRole = ['admin', 'personnel', 'driver', 'utilizer'].includes(role) ? role : 'personnel';

    const plainOtp = generateOtpCode();
    const otpFields = await buildFieldsForNewOtp(
      {
        otpResendCount: 0,
        otpResendWindowStartedAt: null,
        otpLockedUntil: null,
      },
      plainOtp
    );

    const newUser = await User.create({
      fullName: fullName.trim(),
      username: username.trim(),
      email,
      phoneNumber: phoneTrim,
      password: hashed,
      role: safeRole,
      phoneVerified: false,
      ...otpFields,
    });

    let twilioResult;
    try {
      twilioResult = await sendSms(phoneTrim, otpSmsBody(plainOtp));
    } catch (sendErr) {
      await newUser.destroy();
      const mapped = mapOtpErrorToResponse(res, sendErr);
      if (mapped) return mapped;
      return res.status(503).json({ error: 'Unable to send verification SMS. Try again later.' });
    }

    return res.status(201).json(
      withOptionalTwilioMeta(
        {
          ok: true,
          message: 'Account created. Enter the verification code sent to your phone.',
        },
        twilioResult
      )
    );
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This phone number is already registered' });
    }
    const mapped = mapOtpErrorToResponse(res, err);
    if (mapped) return mapped;
    if (process.env.AUTH_VERBOSE_ERRORS === '1') {
      // eslint-disable-next-line no-console
      console.error('[auth/register]', err);
    }
    return res.status(500).json({ error: 'Registration could not be completed' });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, email } = req.body;
    if (!phoneNumber && !email) return res.status(400).json({ error: 'phoneNumber or email required' });

    const user = phoneNumber
      ? await User.findOne({ where: { phoneNumber: phoneNumber.trim() } })
      : await User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.phoneNumber) {
      return res.status(400).json({ error: 'No phone number on file for this account' });
    }

    const plainOtp = generateOtpCode();
    const otpFields = await buildFieldsForNewOtp(user, plainOtp);

    let twilioResult;
    try {
      twilioResult = await sendSms(user.phoneNumber, otpSmsBody(plainOtp));
    } catch (sendErr) {
      const mapped = mapOtpErrorToResponse(res, sendErr);
      if (mapped) return mapped;
      return res.status(503).json({ error: 'Unable to send verification SMS. Try again later.' });
    }

    await user.update({
      ...otpFields,
      phoneVerified: false,
    });

    return res.json(withOptionalTwilioMeta({ ok: true, message: 'OTP sent' }, twilioResult));
  } catch (err) {
    const mapped = mapOtpErrorToResponse(res, err);
    if (mapped) return mapped;
    return res.status(500).json({ error: 'Could not send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, phoneNumber, code } = req.body;
    if (!code || (!email && !phoneNumber)) {
      return res.status(400).json({ error: 'code and email or phoneNumber are required' });
    }

    const user = phoneNumber
      ? await User.findOne({ where: { phoneNumber: phoneNumber.trim() } })
      : await User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await evaluateOtpVerification(user, code);
    await user.update(result.patch);

    if (result.patch.otpLockedUntil) {
      return res.status(429).json({
        error: 'Too many failed attempts. Try again later.',
        retryAfterSec: Math.ceil((new Date(result.patch.otpLockedUntil) - Date.now()) / 1000),
      });
    }

    if (!result.matches) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, fullName: user.fullName, username: user.username },
      SECRET,
      { expiresIn: '7d' }
    );

    if (REDIS_ENABLED) {
      try {
        await saveSession(user.id, token);
      } catch {
        // session persistence is best-effort
      }
    }

    return res.json({
      ok: true,
      message: 'Phone verified',
      token,
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    const mapped = mapOtpErrorToResponse(res, err);
    if (mapped) return mapped;
    return res.status(500).json({ error: 'Verification could not be completed' });
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
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.password) return res.status(400).json({ error: 'Password not set. Contact admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.phoneVerified) {
      return res.status(403).json({
        error: 'Phone verification required before login.',
        code: 'PHONE_NOT_VERIFIED',
        email: user.email,
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, fullName: user.fullName, username: user.username },
      SECRET,
      { expiresIn: '7d' }
    );

    if (REDIS_ENABLED) {
      try {
        await saveSession(user.id, token);
      } catch {
        // best-effort
      }
    }

    res.json({
      token,
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: 'Login could not be completed' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (REDIS_ENABLED) {
      try {
        await deleteSession(req.user.userId);
      } catch {
        // best-effort
      }
    }
    res.json({ ok: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Logout could not be completed' });
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
    res.status(500).json({ error: 'Request could not be completed' });
  }
});

module.exports = router;
