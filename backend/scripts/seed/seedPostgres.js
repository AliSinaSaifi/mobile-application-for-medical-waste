const {
  Container,
  Driver,
  Task,
  User,
  Utilizer,
  addDays,
  assertSeedAllowed,
  closeConnections,
  generateContainers,
  initPostgres,
  passwordHash,
  pick,
  readJson,
  sequelize,
  upsertUser,
} = require('./utils');

async function seedPostgres({ close = true } = {}) {
  assertSeedAllowed('PostgreSQL seed');
  await initPostgres();
  const usersData = readJson('users.json');
  const taskConfig = readJson('tasks.json');
  const containers = generateContainers();
  const hash = await passwordHash();

  const result = await sequelize.transaction(async (transaction) => {
    const admins = [];
    const personnel = [];
    const drivers = [];
    const utilizers = [];

    for (const admin of usersData.admins) admins.push(await upsertUser(admin, 'admin', hash, transaction));
    for (const person of usersData.personnel) personnel.push(await upsertUser(person, 'personnel', hash, transaction));

    for (const driver of usersData.drivers) {
      const user = await upsertUser({
        ...driver,
        department: 'Collection Fleet',
        isAvailable: true,
      }, 'driver', hash, transaction);
      const driverPayload = {
        userId: user.id,
        licenseNumber: driver.licenseNumber,
        licenseExpiry: driver.licenseExpiry,
        company: driver.company,
        plateNumber: driver.plateNumber,
        vehicleModel: driver.vehicleModel,
        vehicleYear: driver.vehicleYear,
        capacity: driver.capacity,
        emergencyContact: { name: driver.fullName, phone: '+77010000000', relation: 'Self' },
        status: 'approved',
      };
      const existingDriver = await Driver.findOne({ where: { userId: user.id }, transaction });
      if (existingDriver) await existingDriver.update(driverPayload, { transaction });
      else await Driver.create(driverPayload, { transaction });
      drivers.push(user);
    }

    for (const utilizer of usersData.utilizers) {
      const user = await upsertUser({
        ...utilizer,
        department: 'Utilization',
        isAvailable: true,
      }, 'utilizer', hash, transaction);
      const utilizerPayload = {
        userId: user.id,
        stationName: utilizer.stationName,
        stationAddress: utilizer.stationAddress,
        stationLat: utilizer.stationLat,
        stationLon: utilizer.stationLon,
        licenseNumber: utilizer.licenseNumber,
        licenseExpiry: utilizer.licenseExpiry,
        wasteTypes: utilizer.wasteTypes,
        capacity: utilizer.capacity,
        method: utilizer.method,
        contactName: utilizer.contactName,
        contactPhone: utilizer.contactPhone,
        status: 'approved',
      };
      const existingUtilizer = await Utilizer.findOne({ where: { userId: user.id }, transaction });
      if (existingUtilizer) await existingUtilizer.update(utilizerPayload, { transaction });
      else await Utilizer.create(utilizerPayload, { transaction });
      utilizers.push(user);
    }

    for (const container of containers) {
      await Container.upsert({
        qrCode: container.qrCode,
        wasteType: container.wasteType,
        location: container.location,
        lat: container.lat,
        lon: container.lon,
      }, { transaction });
    }

    const createdContainers = await Container.findAll({
      where: { qrCode: containers.map((container) => container.qrCode) },
      transaction,
      order: [['qrCode', 'ASC']],
    });

    const statusCounts = Object.entries(taskConfig.statusMix).map(([status, count]) => ({ status, remaining: count }));
    const statuses = [];
    while (statusCounts.some((entry) => entry.remaining > 0)) {
      statusCounts.forEach((entry) => {
        if (entry.remaining > 0) {
          statuses.push(entry.status);
          entry.remaining -= 1;
        }
      });
    }
    const taskCount = Math.min(Number(process.env.SEED_TASK_COUNT || taskConfig.count || statuses.length), createdContainers.length, statuses.length);
    const taskDaysBack = Math.max(taskCount, Number(taskConfig.daysBack || taskCount));
    const now = new Date();

    for (let i = 0; i < taskCount; i += 1) {
      const status = statuses[i];
      const driver = pick(drivers, i);
      const utilizer = ['in_transit', 'at_utilization', 'completed'].includes(status) ? pick(utilizers, i) : null;
      const assignedOffset = taskCount === 1
        ? 1
        : Math.round(taskDaysBack - (i * (taskDaysBack - 1)) / (taskCount - 1));
      const assignedAt = addDays(now, -Math.max(1, assignedOffset));
      const completedAt = status === 'completed' ? addDays(assignedAt, 1) : null;
      const containerId = createdContainers[i].qrCode;

      const existing = await Task.findOne({ where: { containerId }, transaction });
      const payload = {
        containerId,
        driverId: driver.id,
        utilizerId: utilizer?.id || null,
        status,
        assignedAt,
        completedAt,
      };

      if (existing) await existing.update(payload, { transaction });
      else await Task.create(payload, { transaction });
    }

    return {
      admins: admins.length,
      personnel: personnel.length,
      drivers: drivers.length,
      utilizers: utilizers.length,
      containers: createdContainers.length,
      tasks: taskCount,
    };
  });

  console.log('[seed:postgres] complete', result);
  if (close) await closeConnections();
  return result;
}

if (require.main === module) {
  seedPostgres().catch(async (err) => {
    console.error('[seed:postgres] failed', err);
    await closeConnections();
    process.exit(1);
  });
}

module.exports = seedPostgres;
