const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const Container = require('./Container');
const User      = require('./User');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  containerId: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  driverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  utilizerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  status: {
    // matches existing task_status enum in PostgreSQL
    type: DataTypes.ENUM('assigned', 'in_transit', 'at_utilization', 'completed', 'cancelled'),
    defaultValue: 'assigned',
  },
  assignedAt:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  completedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName:  'tasks',
  timestamps: false,
});

Task.belongsTo(Container, { foreignKey: 'containerId', targetKey: 'qrCode', as: 'container' });
Task.belongsTo(User,      { foreignKey: 'driverId',    as: 'driver'    });
Task.belongsTo(User,      { foreignKey: 'utilizerId',  as: 'utilizer'  });
module.exports = Task;