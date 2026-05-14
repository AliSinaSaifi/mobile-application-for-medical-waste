const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fullName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
  },
  username: {
    type: DataTypes.STRING(60),
    allowNull: false,
    defaultValue: '',
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true, // existing rows may be null
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM,
    values: ['admin', 'personnel', 'driver', 'utilizer'],
    allowNull: false,
    defaultValue: 'personnel',
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  /** E.164; unique when not null (see migration partial unique index) */
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  /** Same semantics as isPhoneVerified in requirements */
  phoneVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  otpHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  otpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  otpAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  otpResendCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  otpLastSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  otpResendWindowStartedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  otpLockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  plateNumber: { type: DataTypes.STRING(20), allowNull: true },
  vehicleModel: { type: DataTypes.STRING(100), allowNull: true },
  lastLat: { type: DataTypes.DOUBLE, allowNull: true },
  lastLon: { type: DataTypes.DOUBLE, allowNull: true },
}, {
  tableName: 'users',
  freezeTableName: true,
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  hooks: {},
});

module.exports = User;
