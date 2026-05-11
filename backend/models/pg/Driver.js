const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  licenseNumber: { type: DataTypes.STRING(100), allowNull: false },
  licenseExpiry: { type: DataTypes.DATEONLY,    allowNull: false },
  company:       { type: DataTypes.STRING(255), allowNull: true  },
  plateNumber:   { type: DataTypes.STRING(20),  allowNull: false },
  vehicleModel:  { type: DataTypes.STRING(100), allowNull: true  },
  vehicleYear:   { type: DataTypes.INTEGER,     allowNull: true  },
  capacity:      { type: DataTypes.INTEGER,     allowNull: true  },
  emergencyContact: { type: DataTypes.JSONB,    allowNull: true  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
}, {
  tableName:  'drivers',
  timestamps: true,
});


const User = require('./User');
Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Driver;