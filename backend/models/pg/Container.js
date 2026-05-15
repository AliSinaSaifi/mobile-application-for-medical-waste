const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const {
  normalizeQrCode,
  validateContainerPayload,
} = require('../../utils/containerValidation');

const Container = sequelize.define('Container', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  qrCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    set(value) {
      this.setDataValue('qrCode', normalizeQrCode(value));
    },
    validate: {
      notEmpty: true,
    },
  },
  wasteType: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D'),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,  // e.g. "Block A, Floor 2"
  },
  lat: {
    type: DataTypes.FLOAT,
    validate: {
      min: -90,
      max: 90,
    },
  },
  lon: {
    type: DataTypes.FLOAT,
    validate: {
      min: -180,
      max: 180,
    },
  },
}, {
  tableName: 'containers',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['qrCode'] },
    { fields: ['lat', 'lon'] },
  ],
  hooks: {
    beforeValidate(container) {
      const error = validateContainerPayload(container);
      if (error) throw new Error(error);
    },
  },
});

module.exports = Container;
