const bcrypt = require('bcryptjs');

const DEPARTMENTS = new Set([
  '',
  'surgery',
  'therapy',
  'pediatrics',
  'obstetrics',
  'infectious',
  'lab',
  'icu',
]);

const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,30}$/;
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

function validateUsername(username) {
  if (typeof username !== 'string' || !USERNAME_REGEX.test(username.trim())) {
    return 'Username must be 3-30 characters and only contain letters, numbers, underscores, or hyphens';
  }
  return null;
}

function validateFullName(fullName) {
  if (typeof fullName !== 'string' || fullName.trim().length === 0) {
    return 'Full name is required';
  }
  if (fullName.trim().length > 255) {
    return 'Full name is too long';
  }
  return null;
}

function validateProfilePayload({ fullName, username, department }) {
  const uerr = validateUsername(username);
  if (uerr) return uerr;

  const ferr = validateFullName(fullName);
  if (ferr) return ferr;

  const safeDepartment = typeof department === 'string' ? department.trim() : '';
  if (!DEPARTMENTS.has(safeDepartment)) {
    return 'Invalid department selected';
  }

  return null;
}

function validatePasswordPayload({ currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return 'Current password, new password, and confirmation are required';
  }

  if (newPassword !== confirmPassword) {
    return 'Passwords do not match';
  }

  if (newPassword.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return 'Password must include letters and numbers';
  }

  return null;
}

function validatePhoneNumber(phoneNumber) {
  if (typeof phoneNumber !== 'string' || !E164_REGEX.test(phoneNumber.trim())) {
    return 'Phone number must be in E.164 format (example: +77051234567)';
  }
  return null;
}

function buildProfileDto(user) {
  return {
    username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
    fullName: user.fullName || '',
    email: user.email,
    department: user.department || '',
    phone: {
      number: user.phoneNumber || '',
      verified: Boolean(user.phoneVerified),
    },
    role: user.role,
    status: 'Active',
  };
}

async function verifyCurrentPassword(user, currentPassword) {
  if (!user.password) {
    return false;
  }
  return bcrypt.compare(currentPassword, user.password);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

module.exports = {
  buildProfileDto,
  validateProfilePayload,
  validatePasswordPayload,
  validatePhoneNumber,
  verifyCurrentPassword,
  hashPassword,
};
