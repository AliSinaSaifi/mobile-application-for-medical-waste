const User      = require('../models/pg/User');
const Task      = require('../models/pg/Task');
const Container = require('../models/pg/Container');
const Driver = require('../models/pg/Driver');
const { sendTaskAssignedEmail } = require('./email');

function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function autoAssignDriver(containerId, fullness = 0) {
  const container = await Container.findByPk(containerId);
  if (!container) throw new Error('Container not found');

  const drivers = await User.findAll({
    where: { role: 'driver', isAvailable: true },
  });
  if (drivers.length === 0) {
    console.warn('⚠️ No available drivers');
    return null;
  }

  let chosen = drivers[0];
  if (container.lat && container.lon) {
    const withDistance = drivers
      .filter(d => d.lastLat && d.lastLon)
      .map(d => ({
        driver: d,
        dist:   haversine(d.lastLat, d.lastLon, container.lat, container.lon),
      }))
      .sort((a, b) => a.dist - b.dist);

    if (withDistance.length > 0) {
      chosen = withDistance[0].driver;
      console.log(`📍 Nearest driver: ${chosen.email} (${withDistance[0].dist.toFixed(1)} km away)`);
    }
  }
  const driverRecord = await Driver.findOne({ where: { userId: chosen.id, status: 'approved' } });
  if (!driverRecord) {
    console.warn(`⚠️ No driver record for user ${chosen.email}`);
    return null;
  }

  const task = await Task.create({
    containerId: container.qrCode,
    driverId:    driverRecord.id,
    status:      'assigned',
    assignedAt:  new Date(),
  });

  await chosen.update({ isAvailable: false });
  console.log(`✅ Auto-assigned driver ${chosen.email} to ${container.qrCode}`);

  // 📧 Email notification to driver
  await sendTaskAssignedEmail(
    chosen.email,
    chosen.fullName || chosen.email,
    container.qrCode,
    container.location,
    fullness
  );

  return task;
}

async function autoAssignUtilizer(taskId) {
  const task = await Task.findByPk(taskId);
  if (!task) throw new Error('Task not found');

  const utilizer = await User.findOne({
    where: { role: 'utilizer', isAvailable: true },
  });

  if (!utilizer) {
    console.warn('⚠️ No available utilizer found');
    return null;
  }

  await task.update({ utilizerId: utilizer.id });
  console.log(`✅ Auto-assigned utilizer ${utilizer.email} to task ${taskId}`);
  return task;
}

module.exports = { autoAssignDriver, autoAssignUtilizer };