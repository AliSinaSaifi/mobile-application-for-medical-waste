const { Op } = require('sequelize');
const Task = require('../models/pg/Task');
const User = require('../models/pg/User');
const Driver = require('../models/pg/Driver');
const Container = require('../models/pg/Container');
const Utilizer = require('../models/pg/Utilizer');
const DisposalLog = require('../models/mongo/DisposalLog');
const RoutePoint = require('../models/mongo/RoutePoint');
const { emitRoutePoint } = require('./Socket');

const STATUS_MAP = {
  assigned: 'active',
  in_transit: 'active',
  at_utilization: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
};

const VALID_STATUSES = new Set(['all', 'active', 'completed', 'cancelled']);
const SORT_FIELDS = new Set(['assignedAt', 'completedAt', 'distance', 'bins', 'status', 'name']);

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseDateRange({ period, startDate, endDate } = {}) {
  const now = new Date();
  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : null;

  if (startDate && (!start || Number.isNaN(start.getTime()))) {
    const err = new Error('Invalid startDate');
    err.status = 400;
    throw err;
  }
  if (endDate && (!end || Number.isNaN(end.getTime()))) {
    const err = new Error('Invalid endDate');
    err.status = 400;
    throw err;
  }

  if ((!start || Number.isNaN(start.getTime())) && period && period !== 'all') {
    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  }

  if (start && Number.isNaN(start.getTime())) start = null;
  if (end && Number.isNaN(end.getTime())) end = null;
  if (endDate && end) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  if (start && end && start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  return { start, end };
}

async function buildTaskWhere(query, user) {
  const status = VALID_STATUSES.has(query.status) ? query.status : 'all';
  const dateRange = parseDateRange(query);
  const where = {};

  if (status === 'active') where.status = { [Op.in]: ['assigned', 'in_transit', 'at_utilization'] };
  if (status === 'completed') where.status = 'completed';
  if (status === 'cancelled') where.status = 'cancelled';

  const dateFilter = {};
  if (dateRange.start) dateFilter[Op.gte] = dateRange.start;
  if (dateRange.end) dateFilter[Op.lt] = dateRange.end;
  if (Object.keys(dateFilter).length) {
    where[Op.or] = [
      { assignedAt: dateFilter },
      { completedAt: dateFilter },
    ];
  }

  if (user.role === 'driver') {
    const driver = await Driver.findOne({ where: { userId: user.userId } });
    where.driverId = { [Op.in]: [user.userId, driver?.id].filter(Boolean) };
  } else if (user.role === 'utilizer') {
    where.utilizerId = user.userId;
  }

  return { where, status, dateRange };
}

function isValidCoordinate(lat, lon) {
  const parsedLat = Number(lat);
  const parsedLon = Number(lon);
  return (
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLon) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLon >= -180 &&
    parsedLon <= 180
  );
}

function validateOptionalNumber(value, { min, max, name }) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    const err = new Error(`${name} must be between ${min} and ${max}`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

function haversineKm(a, b) {
  const [lat1, lon1] = a.map(Number);
  const [lat2, lon2] = b.map(Number);
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function distanceKm(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineKm(points[i - 1], points[i]);
  return Number(total.toFixed(1));
}

function durationMinutes(task) {
  const start = task.assignedAt ? new Date(task.assignedAt) : null;
  const end = task.completedAt ? new Date(task.completedAt) : new Date();
  if (!start || Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

async function getDriversByTask(tasks) {
  const ids = [...new Set(tasks.map((task) => task.driverId).filter(Boolean))];
  const [users, driversById, driversByUserId] = await Promise.all([
    User.findAll({ where: { id: { [Op.in]: ids } } }),
    Driver.findAll({ where: { id: { [Op.in]: ids } }, include: [{ model: User, as: 'user' }] }),
    Driver.findAll({ where: { userId: { [Op.in]: ids } }, include: [{ model: User, as: 'user' }] }),
  ]);

  const map = new Map();
  users.forEach((user) => map.set(user.id, { user }));
  driversById.forEach((driver) => map.set(driver.id, { driver, user: driver.user }));
  driversByUserId.forEach((driver) => map.set(driver.userId, { driver, user: driver.user }));
  return map;
}

async function getUtilizersByTask(tasks) {
  const ids = [...new Set(tasks.map((task) => task.utilizerId).filter(Boolean))];
  if (!ids.length) return new Map();
  const utilizers = await Utilizer.findAll({ where: { userId: { [Op.in]: ids } }, include: [{ model: User, as: 'user' }] });
  return new Map(utilizers.map((utilizer) => [utilizer.userId, utilizer]));
}

function fallbackCoordinates(task, driverInfo, utilizer) {
  const points = [];
  const driverUser = driverInfo?.user;
  if (isValidCoordinate(driverUser?.lastLat, driverUser?.lastLon)) {
    points.push([Number(driverUser.lastLat), Number(driverUser.lastLon)]);
  }

  if (isValidCoordinate(task.container?.lat, task.container?.lon)) {
    points.push([Number(task.container.lat), Number(task.container.lon)]);
  }

  if (isValidCoordinate(utilizer?.stationLat, utilizer?.stationLon)) {
    points.push([Number(utilizer.stationLat), Number(utilizer.stationLon)]);
  }

  return points;
}

async function routeCoordinates(task, driverInfo, utilizer, limit = 500) {
  const points = await RoutePoint.find({
    $or: [
      { taskId: task.id },
      { routeId: task.id },
    ],
  })
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();

  if (points.length) {
    const coordinates = points
      .filter((point) => isValidCoordinate(point.lat, point.lon))
      .map((point) => [Number(point.lat), Number(point.lon)]);

    return {
      coordinates,
      coordinateSource: coordinates.length ? 'route_points' : 'none',
    };
  }

  const coordinates = fallbackCoordinates(task, driverInfo, utilizer);
  return {
    coordinates,
    coordinateSource: coordinates.length ? 'stored_entity_coordinates_fallback' : 'none',
  };
}

function taskName(task) {
  return `Route #${String(task.id).padStart(4, '0')}`;
}

function statusLabel(status) {
  return STATUS_MAP[status] || 'active';
}

async function serializeRoute(task, driverInfo, utilizer, disposalLog, includeCoordinates = true) {
  const routePath = includeCoordinates
    ? await routeCoordinates(task, driverInfo, utilizer)
    : { coordinates: [], coordinateSource: 'not_requested' };
  const coordinates = routePath.coordinates;
  const calculatedDistance = coordinates.length >= 2 ? distanceKm(coordinates) : 0;
  const storedDistance = Number(disposalLog?.distanceKm);
  const distance = Number.isFinite(storedDistance) && storedDistance > 0 ? Number(storedDistance.toFixed(1)) : calculatedDistance;
  const driver = driverInfo?.driver;
  const user = driverInfo?.user;

  return {
    id: task.id,
    taskId: task.id,
    name: taskName(task),
    status: statusLabel(task.status),
    rawStatus: task.status,
    distance,
    durationMinutes: durationMinutes(task),
    bins: 1,
    containerId: task.containerId,
    containerLocation: task.container?.location || '',
    assignedAt: task.assignedAt,
    completedAt: task.completedAt,
    driverId: task.driverId,
    driverName: user?.fullName || user?.email || 'Unassigned driver',
    vehicle: {
      plateNumber: driver?.plateNumber || user?.plateNumber || '',
      model: driver?.vehicleModel || user?.vehicleModel || '',
    },
    utilizer: utilizer ? {
      id: utilizer.id,
      name: utilizer.stationName,
      address: utilizer.stationAddress,
    } : null,
    coordinates,
    coordinateSource: routePath.coordinateSource,
    hasRealGpsPoints: routePath.coordinateSource === 'route_points',
    stops: coordinates.map((point, index) => ({
      index: index + 1,
      lat: point[0],
      lon: point[1],
      label: index === 0 ? 'Start' : index === coordinates.length - 1 ? 'Destination' : `Point ${index + 1}`,
    })),
  };
}

async function getRouteHistory(query, user) {
  const { where } = await buildTaskWhere(query, user);
  const page = clampNumber(query.page, 1, 100000, 1);
  const limit = clampNumber(query.limit, 1, 100, 50);
  const sortBy = SORT_FIELDS.has(query.sortBy) ? query.sortBy : 'assignedAt';
  const sortDir = String(query.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const search = String(query.search || '').trim().toLowerCase();

  const { count, rows } = await Task.findAndCountAll({
    where,
    include: [{ model: Container, as: 'container' }],
    order: sortBy === 'name' || sortBy === 'distance' || sortBy === 'bins'
      ? [['assignedAt', sortDir]]
      : [[sortBy, sortDir]],
    limit,
    offset: (page - 1) * limit,
  });

  const [driverMap, utilizerMap, disposalLogs] = await Promise.all([
    getDriversByTask(rows),
    getUtilizersByTask(rows),
    DisposalLog.find({ taskId: { $in: rows.map((task) => task.id) } }).lean(),
  ]);
  const logMap = new Map(disposalLogs.map((log) => [log.taskId, log]));

  let routes = await Promise.all(rows.map((task) => serializeRoute(
    task,
    driverMap.get(task.driverId),
    utilizerMap.get(task.utilizerId),
    logMap.get(task.id),
    true
  )));

  if (search) {
    routes = routes.filter((route) => [
      route.name,
      route.containerId,
      route.driverName,
      route.vehicle.plateNumber,
      route.containerLocation,
    ].some((value) => String(value || '').toLowerCase().includes(search)));
  }

  const completed = routes.filter((route) => route.status === 'completed').length;
  const totalDistance = Number(routes.reduce((sum, route) => sum + (Number(route.distance) || 0), 0).toFixed(1));

  return {
    kpis: {
      totalRoutes: count,
      completed,
      totalDistance,
      containersCollected: routes.reduce((sum, route) => sum + (Number(route.bins) || 0), 0),
    },
    routes,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.max(1, Math.ceil(count / limit)),
    },
  };
}

async function getRouteDetail(taskId, user) {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Invalid route id');
    err.status = 400;
    throw err;
  }

  const where = { id };
  if (user.role === 'driver') {
    const driver = await Driver.findOne({ where: { userId: user.userId } });
    where.driverId = { [Op.in]: [user.userId, driver?.id].filter(Boolean) };
  }
  if (user.role === 'utilizer') where.utilizerId = user.userId;

  const task = await Task.findOne({
    where,
    include: [{ model: Container, as: 'container' }],
  });
  if (!task) {
    const err = new Error('Route not found');
    err.status = 404;
    throw err;
  }

  const [driverMap, utilizerMap, disposalLog] = await Promise.all([
    getDriversByTask([task]),
    getUtilizersByTask([task]),
    DisposalLog.findOne({ taskId: task.id }).lean(),
  ]);

  return serializeRoute(task, driverMap.get(task.driverId), utilizerMap.get(task.utilizerId), disposalLog, true);
}

async function addRoutePoint(taskId, body, user) {
  const id = Number(taskId);
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!Number.isInteger(id) || id <= 0 || !isValidCoordinate(lat, lon)) {
    const err = new Error('taskId, lat, and lon are required');
    err.status = 400;
    throw err;
  }

  const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
  if (Number.isNaN(timestamp.getTime())) {
    const err = new Error('Invalid timestamp');
    err.status = 400;
    throw err;
  }

  const speedKph = validateOptionalNumber(body.speedKph, { min: 0, max: 200, name: 'speedKph' });
  const heading = validateOptionalNumber(body.heading, { min: 0, max: 360, name: 'heading' });

  const where = { id };
  if (user.role === 'driver') {
    const driver = await Driver.findOne({ where: { userId: user.userId } });
    where.driverId = { [Op.in]: [user.userId, driver?.id].filter(Boolean) };
  }
  const task = await Task.findOne({ where });
  if (!task) {
    const err = new Error('Route not found or not yours');
    err.status = 404;
    throw err;
  }

  if (!['in_transit', 'at_utilization'].includes(task.status)) {
    const err = new Error('Route is not active for GPS tracking');
    err.status = 400;
    throw err;
  }

  const latest = await RoutePoint.findOne({
    $or: [{ taskId: id }, { routeId: id }],
  }).sort({ timestamp: -1 }).lean();

  if (latest) {
    const latestTime = new Date(latest.timestamp).getTime();
    const deltaMs = timestamp.getTime() - latestTime;
    if (deltaMs <= 0) {
      const err = new Error('GPS timestamp must be newer than the latest route point');
      err.status = 400;
      throw err;
    }
    if (deltaMs < 3000) {
      const err = new Error('GPS updates are too frequent');
      err.status = 429;
      throw err;
    }
    if (Number(latest.lat) === lat && Number(latest.lon) === lon) {
      const err = new Error('Duplicate GPS coordinate ignored');
      err.status = 409;
      throw err;
    }
  }

  const point = await RoutePoint.create({
    routeId: id,
    taskId: id,
    driverId: task.driverId,
    lat,
    lon,
    speedKph,
    heading,
    source: body.source || 'gps',
    timestamp,
  });

  const routePath = await routeCoordinates(task, null, null, 1000);
  const payload = {
    routeId: id,
    taskId: id,
    point: {
      lat,
      lon,
      speedKph,
      heading,
      timestamp: point.timestamp,
    },
    coordinates: routePath.coordinates,
    distance: distanceKm(routePath.coordinates),
    status: statusLabel(task.status),
  };

  emitRoutePoint(id, payload);
  return { point, live: payload };
}

function routesToCsv(routes) {
  const rows = [
    ['Route', 'Status', 'Driver', 'Vehicle', 'Container', 'Distance (km)', 'Duration (min)', 'Assigned', 'Completed'],
    ...routes.map((route) => [
      route.name,
      route.status,
      route.driverName,
      [route.vehicle.model, route.vehicle.plateNumber].filter(Boolean).join(' '),
      route.containerId,
      route.distance,
      route.durationMinutes,
      route.assignedAt || '',
      route.completedAt || '',
    ]),
  ];

  return rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

module.exports = {
  addRoutePoint,
  getRouteDetail,
  getRouteHistory,
  routesToCsv,
};
