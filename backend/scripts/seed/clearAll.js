const { Op } = require('sequelize');
const {
  Alert,
  Container,
  DisposalLog,
  Driver,
  History,
  Notification,
  RoutePoint,
  SEED_EMAIL_DOMAIN,
  SEED_PREFIX,
  Task,
  User,
  Utilizer,
  assertSeedAllowed,
  closeConnections,
  initMongo,
  initPostgres,
  sequelize,
} = require('./utils');

async function clearAll({ close = true } = {}) {
  assertSeedAllowed('Seed clear');
  await initPostgres();
  await initMongo();

  const containers = await Container.findAll({
    where: { qrCode: { [Op.like]: `${SEED_PREFIX}-%` } },
    attributes: ['qrCode'],
  });
  const qrCodes = containers.map((container) => container.qrCode);

  const users = await User.findAll({
    where: { email: { [Op.like]: `%@${SEED_EMAIL_DOMAIN}` } },
    attributes: ['id'],
  });
  const userIds = users.map((user) => user.id);

  const tasks = await Task.findAll({
    where: qrCodes.length ? { containerId: qrCodes } : { id: -1 },
    attributes: ['id'],
  });
  const taskIds = tasks.map((task) => task.id);

  const mongoResult = {
    telemetry: (await History.deleteMany({ binId: { $in: qrCodes } })).deletedCount,
    alerts: (await Alert.deleteMany({ containerId: { $in: qrCodes } })).deletedCount,
    routePoints: (await RoutePoint.deleteMany({ taskId: { $in: taskIds } })).deletedCount,
    disposalLogs: (await DisposalLog.deleteMany({
      $or: [{ taskId: { $in: taskIds } }, { containerId: { $in: qrCodes } }],
    })).deletedCount,
    notifications: (await Notification.deleteMany({ userId: { $in: userIds } })).deletedCount,
  };

  const postgresResult = await sequelize.transaction(async (transaction) => {
    const deletedTasks = await Task.destroy({ where: { id: taskIds }, transaction });
    const deletedDrivers = await Driver.destroy({ where: { userId: userIds }, transaction });
    const deletedUtilizers = await Utilizer.destroy({ where: { userId: userIds }, transaction });
    const deletedContainers = await Container.destroy({ where: { qrCode: qrCodes }, transaction });
    const deletedUsers = await User.destroy({ where: { id: userIds }, transaction });
    return {
      tasks: deletedTasks,
      drivers: deletedDrivers,
      utilizers: deletedUtilizers,
      containers: deletedContainers,
      users: deletedUsers,
    };
  });

  const result = { postgres: postgresResult, mongo: mongoResult };
  console.log('[seed:clear] complete', result);
  if (close) await closeConnections();
  return result;
}

if (require.main === module) {
  clearAll().catch(async (err) => {
    console.error('[seed:clear] failed', err);
    await closeConnections();
    process.exit(1);
  });
}

module.exports = clearAll;
