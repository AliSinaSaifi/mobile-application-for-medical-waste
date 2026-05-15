const { Op } = require('sequelize');
const {
  Alert,
  Container,
  DisposalLog,
  History,
  Notification,
  RoutePoint,
  SEED_EMAIL_DOMAIN,
  SEED_PREFIX,
  Task,
  User,
  Utilizer,
  addDays,
  addHours,
  assertSeedAllowed,
  closeConnections,
  generateTelemetryForContainer,
  initMongo,
  initPostgres,
  interpolateRoute,
  pick,
  rand,
  randInt,
  readJson,
} = require('./utils');

function latestByBin(telemetryDocs) {
  const latest = new Map();
  for (const doc of telemetryDocs) latest.set(doc.binId, doc);
  return latest;
}

async function seedMongo({ close = true } = {}) {
  assertSeedAllowed('Mongo seed');
  await initPostgres();
  await initMongo();

  const telemetryConfig = readJson('telemetry.json');
  const alertConfig = readJson('alerts.json');
  const notificationConfig = readJson('notifications.json');
  const disposalConfig = readJson('disposalLogs.json');
  const routeConfig = readJson('routePoints.json');

  const containers = await Container.findAll({
    where: { qrCode: { [Op.like]: `${SEED_PREFIX}-%` } },
    order: [['qrCode', 'ASC']],
  });

  if (!containers.length) {
    throw new Error('No seeded containers found. Run npm run seed:postgres before npm run seed:mongo.');
  }

  const qrCodes = containers.map((container) => container.qrCode);
  const tasks = await Task.findAll({
    where: { containerId: qrCodes },
    include: [{ model: Container, as: 'container' }],
    order: [['id', 'ASC']],
  });
  const taskIds = tasks.map((task) => task.id);
  const seedUsers = await User.findAll({
    where: { email: { [Op.like]: `%@${SEED_EMAIL_DOMAIN}` } },
    order: [['id', 'ASC']],
  });
  const seedUserIds = seedUsers.map((user) => user.id);
  const utilizers = await Utilizer.findAll({ where: { userId: seedUserIds } });

  await Promise.all([
    History.deleteMany({ binId: { $in: qrCodes } }),
    Alert.deleteMany({ containerId: { $in: qrCodes } }),
    RoutePoint.deleteMany({ taskId: { $in: taskIds } }),
    DisposalLog.deleteMany({ $or: [{ taskId: { $in: taskIds } }, { containerId: { $in: qrCodes } }] }),
    Notification.deleteMany({ userId: { $in: seedUserIds } }),
  ]);

  const telemetryDocs = containers.flatMap((container, index) =>
    generateTelemetryForContainer(container, index, telemetryConfig)
  );
  await History.insertMany(telemetryDocs, { ordered: false });
  const latest = latestByBin(telemetryDocs);

  const criticalContainers = containers
    .filter((container) => (latest.get(container.qrCode)?.fullness || 0) >= 85)
    .slice(0, alertConfig.maxUnresolvedCritical);
  const warningContainers = containers
    .filter((container) => {
      const fullness = latest.get(container.qrCode)?.fullness || 0;
      return fullness >= 70 && fullness < 85;
    })
    .slice(0, alertConfig.warningCount);

  const alertDocs = [
    ...criticalContainers.map((container) => ({
      severity: 'critical',
      type: 'fullness',
      title: 'Critical bin fullness',
      message: `${container.qrCode} is at ${latest.get(container.qrCode).fullness}% fullness.`,
      containerId: container.qrCode,
      location: container.location,
      resolved: false,
      timestamp: latest.get(container.qrCode).timestamp,
    })),
    ...warningContainers.map((container) => ({
      severity: 'warning',
      type: 'fullness',
      title: 'Bin approaching capacity',
      message: `${container.qrCode} is at ${latest.get(container.qrCode).fullness}% fullness.`,
      containerId: container.qrCode,
      location: container.location,
      resolved: false,
      timestamp: latest.get(container.qrCode).timestamp,
    })),
    ...containers.slice(0, alertConfig.maxResolved).map((container, index) => ({
      severity: index % 2 === 0 ? 'warning' : 'critical',
      type: 'fullness',
      title: 'Resolved fullness alert',
      message: `${container.qrCode} was collected and returned to service.`,
      containerId: container.qrCode,
      location: container.location,
      resolved: true,
      timestamp: addDays(new Date(), -randInt(3, 18)),
    })),
  ];
  if (alertDocs.length) await Alert.insertMany(alertDocs, { ordered: false });

  const utilizerByUserId = new Map(utilizers.map((utilizer) => [utilizer.userId, utilizer]));
  const routePointDocs = [];
  for (const task of tasks.filter((item) => ['in_transit', 'at_utilization', 'completed'].includes(item.status))) {
    const container = task.container;
    const utilizer = utilizerByUserId.get(task.utilizerId);
    if (!container || !utilizer?.stationLat || !utilizer?.stationLon) continue;

    const firstTimestamp = addHours(task.assignedAt || new Date(), 0.5);
    const points = interpolateRoute(
      { lat: Number(container.lat), lon: Number(container.lon) },
      { lat: Number(utilizer.stationLat), lon: Number(utilizer.stationLon) },
      routeConfig.pointsPerRoute,
      firstTimestamp,
      routeConfig
    ).map((point) => ({
      ...point,
      routeId: task.id,
      taskId: task.id,
      driverId: task.driverId,
    }));
    routePointDocs.push(...points);
  }
  if (routePointDocs.length) await RoutePoint.insertMany(routePointDocs, { ordered: false });

  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const disposalDocs = completedTasks.map((task, index) => {
    const finalTelemetry = latest.get(task.containerId);
    return {
      taskId: task.id,
      containerId: task.containerId,
      driverId: task.driverId,
      utilizerId: task.utilizerId,
      wasteType: task.container?.wasteType,
      weightKg: Number(rand(disposalConfig.minWeightKg, disposalConfig.maxWeightKg).toFixed(1)),
      fullness: finalTelemetry?.fullness || randInt(72, 96),
      method: pick(disposalConfig.methods, index),
      notes: 'Seeded operational disposal record linked to completed collection task.',
      completedAt: task.completedAt || addHours(task.assignedAt || new Date(), 18),
    };
  });
  if (disposalDocs.length) await DisposalLog.insertMany(disposalDocs, { ordered: false });

  const adminUsers = seedUsers.filter((user) => user.role === 'admin' || user.role === 'personnel');
  const driverUsers = seedUsers.filter((user) => user.role === 'driver');
  const notificationDocs = [];

  for (const user of adminUsers) {
    notificationDocs.push({
      userId: user.id,
      title: 'Seed import completed',
      message: `${containers.length} Astana medical containers are available for QA.`,
      type: 'success',
      read: false,
      createdAt: addHours(new Date(), -randInt(1, 8)),
    });
    notificationDocs.push({
      userId: user.id,
      title: 'Critical bins require review',
      message: `${criticalContainers.length} seeded bins currently need route attention.`,
      type: criticalContainers.length ? 'error' : 'info',
      read: false,
      createdAt: addHours(new Date(), -randInt(1, 12)),
    });
  }

  for (const user of driverUsers) {
    const assignedTask = pick(tasks.filter((task) => task.driverId === user.id), 0);
    if (!assignedTask) continue;
    notificationDocs.push({
      userId: user.id,
      title: 'Route assignment ready',
      message: `Task #${assignedTask.id} is linked to ${assignedTask.containerId}.`,
      type: 'info',
      read: randInt(0, 1) === 1,
      createdAt: addHours(new Date(), -randInt(2, 24)),
    });
  }

  const limitedNotificationDocs = notificationDocs.slice(0, seedUsers.length * notificationConfig.perUserLimit);
  if (limitedNotificationDocs.length) await Notification.insertMany(limitedNotificationDocs, { ordered: false });

  const result = {
    telemetry: telemetryDocs.length,
    alerts: alertDocs.length,
    routePoints: routePointDocs.length,
    disposalLogs: disposalDocs.length,
    notifications: limitedNotificationDocs.length,
  };

  console.log('[seed:mongo] complete', result);
  if (close) await closeConnections();
  return result;
}

if (require.main === module) {
  seedMongo().catch(async (err) => {
    console.error('[seed:mongo] failed', err);
    await closeConnections();
    process.exit(1);
  });
}

module.exports = seedMongo;
