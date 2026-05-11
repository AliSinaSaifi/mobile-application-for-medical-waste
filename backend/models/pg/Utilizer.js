const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Utilizer = sequelize.define('Utilizer', {
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
  // Station info
  stationName:    { type: DataTypes.STRING(255), allowNull: false },
  stationAddress: { type: DataTypes.STRING(500), allowNull: false },
  stationLat:     { type: DataTypes.FLOAT,       allowNull: true  },
  stationLon:     { type: DataTypes.FLOAT,       allowNull: true  },

  // License
  licenseNumber:  { type: DataTypes.STRING(100), allowNull: false },
  licenseExpiry:  { type: DataTypes.DATEONLY,    allowNull: false },

  // Capabilities
  wasteTypes: {
    type: DataTypes.ARRAY(DataTypes.STRING), // ['A','B','C','D']
    defaultValue: [],
  },
  capacity:    { type: DataTypes.INTEGER, allowNull: true }, // kg/day
  method: {
    type: DataTypes.ENUM('incineration', 'autoclave', 'chemical', 'landfill'),
    defaultValue: 'incineration',
  },

  // Emergency contact
  contactName:  { type: DataTypes.STRING(255), allowNull: true },
  contactPhone: { type: DataTypes.STRING(50),  allowNull: true },

  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
}, {
  tableName:  'utilizers',
  timestamps: true,
});


const User = require('./User');
Utilizer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Utilizer;