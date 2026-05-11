const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

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
  },
  wasteType: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D'),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,  // e.g. "Block A, Floor 2"
  },
  lat: { type: DataTypes.FLOAT },
  lon: { type: DataTypes.FLOAT },
}, {
  tableName: 'containers',
  timestamps: true,
});

module.exports = Container;