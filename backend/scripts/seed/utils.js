require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { sequelize, connectPostgres, connectMongo } = require('../../config/db');

require('../../models/pg/User');
require('../../models/pg/Container');
require('../../models/pg/Task');
require('../../models/pg/Driver');
require('../../models/pg/Utilizer');

const User = require('../../models/pg/User');
const Container = require('../../models/pg/Container');
const Task = require('../../models/pg/Task');
const Driver = require('../../models/pg/Driver');
const Utilizer = require('../../models/pg/Utilizer');
const History = require('../../models/mongo/History');
const Alert = require('../../models/Alert');
const Notification = require('../../models/Notification');
const RoutePoint = require('../../models/mongo/RoutePoint');
const DisposalLog = require('../../models/mongo/DisposalLog');

const SEED_PREFIX = 'AST-MED';
const SEED_EMAIL_DOMAIN = 'medwaste.kz';
const DATA_DIR = path.join(__dirname, 'data');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

function makeRng(seed = 20260515) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const rng = makeRng(Number(process.env.SEED_RANDOM || 20260515));

function rand(min, max) {
  return min + (max - min) * rng();
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(items, index) {
  return items[index % items.length];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function blendTelemetryTail(docs, targetFullness, tailLength = 8) {
  if (!docs.length) return;

  const startIndex = Math.max(0, docs.length - tailLength);
  const startFullness = Number(docs[startIndex].fullness);
  const steps = Math.max(1, docs.length - startIndex - 1);

  for (let index = startIndex; index < docs.length; index += 1) {
    const ratio = (index - startIndex) / steps;
    const noise = index === docs.length - 1 ? 0 : rand(-0.6, 0.6);
    docs[index].fullness = Number(clamp(
      startFullness + (targetFullness - startFullness) * ratio + noise,
      4,
      100
    ).toFixed(1));
  }
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function headingBetween(a, b) {
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
}

function validateCoordinate(lat, lon) {
  return Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lon)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lon) >= -180 &&
    Number(lon) <= 180;
}

function generateContainers() {
  const config = readJson('containers.json');
  const wasteTypes = ['A', 'B', 'C', 'D'];
  const count = clamp(Number(process.env.SEED_CONTAINER_COUNT || config.count || 60), 40, 80);

  return Array.from({ length: count }, (_, index) => {
    const location = pick(config.locations, index);
    const offset = Math.floor(index / config.locations.length);
    const lat = Number((location.lat + rand(-0.0022, 0.0022)).toFixed(6));
    const lon = Number((location.lon + rand(-0.0022, 0.0022)).toFixed(6));
    if (!validateCoordinate(lat, lon)) throw new Error(`Invalid generated coordinates for ${location.name}`);

    return {
      qrCode: `${config.prefix}-${String(index + 1).padStart(3, '0')}`,
      wasteType: pick(wasteTypes, index),
      location: `${location.name}, ${location.department}, Floor ${offset + 1}`,
      lat,
      lon,
      facilityName: location.name,
    };
  });
}

function generateTelemetryForContainer(container, index, config = readJson('telemetry.json')) {
  const now = new Date();
  const points = randInt(config.minPointsPerContainer, config.maxPointsPerContainer);
  const daysBack = Math.max(1, Number(config.daysBack || 21));
  const recentOffsetHours = config.distributeAcrossRange ? rand(0, 18) : 0;
  const end = addHours(now, -recentOffsetHours);
  const start = config.distributeAcrossRange
    ? addDays(end, -daysBack)
    : addDays(now, -daysBack + rand(0, 3));
  const category = index % 12;
  let fullness = category < 2 ? rand(8, 22) : category < 5 ? rand(25, 45) : category < 8 ? rand(48, 66) : rand(62, 78);
  const hourlyStep = category < 2 ? rand(0.25, 0.55) : category < 5 ? rand(0.45, 0.85) : rand(0.7, 1.35);
  const intervalHours = config.distributeAcrossRange
    ? (daysBack * 24) / Math.max(points - 1, 1)
    : rand(4, 8);
  const readingStep = config.distributeAcrossRange
    ? (category < 2 ? rand(0.7, 1.6) : category < 5 ? rand(1.1, 2.2) : rand(1.7, 3.4))
    : null;
  const resetThreshold = category < 3 ? rand(70, 84) : rand(86, 98);
  const docs = [];

  for (let i = 0; i < points; i += 1) {
    const timestamp = addHours(start, i * intervalHours);
    const noise = rand(-1.2, 1.2);
    fullness = clamp(fullness + (readingStep ?? hourlyStep * intervalHours) + noise, 4, 100);

    if (fullness >= resetThreshold && i < points - 8 && (i + index) % 17 === 0) {
      docs.push({ binId: container.qrCode, fullness: Number(fullness.toFixed(1)), timestamp });
      fullness = rand(6, 18);
      continue;
    }

    docs.push({ binId: container.qrCode, fullness: Number(fullness.toFixed(1)), timestamp });
  }

  if (category >= 9) blendTelemetryTail(docs, rand(86, 97), 10);
  if (category < 2) blendTelemetryTail(docs, rand(12, 36), 10);
  if (category >= 5 && category < 9) blendTelemetryTail(docs, rand(68, 84), 10);

  return docs.sort((a, b) => a.timestamp - b.timestamp);
}

function interpolateRoute(start, end, points, firstTimestamp, routeConfig = readJson('routePoints.json')) {
  const docs = [];
  const heading = headingBetween(start, end);
  for (let i = 0; i < points; i += 1) {
    const ratio = points === 1 ? 1 : i / (points - 1);
    docs.push({
      lat: Number((start.lat + (end.lat - start.lat) * ratio + rand(-routeConfig.jitter, routeConfig.jitter)).toFixed(6)),
      lon: Number((start.lon + (end.lon - start.lon) * ratio + rand(-routeConfig.jitter, routeConfig.jitter)).toFixed(6)),
      speedKph: i === 0 || i === points - 1 ? 0 : Number(rand(24, 54).toFixed(1)),
      heading: Number((heading + rand(-9, 9)).toFixed(1)),
      source: 'seed-gps',
      timestamp: addHours(firstTimestamp, i * 0.08),
    });
  }
  return docs;
}

async function upsertUser(user, role, passwordHash, transaction) {
  const [row] = await User.findOrCreate({
    where: { email: user.email },
    defaults: {
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: passwordHash,
      role,
      department: user.department || null,
      isAvailable: user.isAvailable ?? true,
      plateNumber: user.plateNumber || null,
      vehicleModel: user.vehicleModel || null,
      lastLat: user.lastLat || null,
      lastLon: user.lastLon || null,
    },
    transaction,
  });

  await row.update({
    fullName: user.fullName,
    username: user.username,
    password: passwordHash,
    role,
    department: user.department || null,
    plateNumber: user.plateNumber || null,
    vehicleModel: user.vehicleModel || null,
    lastLat: user.lastLat || null,
    lastLon: user.lastLon || null,
  }, { transaction });

  return row;
}

async function initPostgres() {
  await connectPostgres();
  if (!sequelize) throw new Error('PostgreSQL is not configured');
}

async function initMongo() {
  await connectMongo();
  if (mongoose.connection.readyState !== 1) throw new Error('MongoDB is not configured');
}

async function closeConnections() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (sequelize) await sequelize.close();
}

async function passwordHash() {
  const { password } = readJson('users.json');
  return bcrypt.hash(password, 10);
}

function assertSeedAllowed(action) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error(
      `${action} blocked: set ALLOW_PRODUCTION_SEED=true to run seed scripts against NODE_ENV=production.`
    );
  }
}

module.exports = {
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
  addDays,
  addHours,
  assertSeedAllowed,
  closeConnections,
  generateContainers,
  generateTelemetryForContainer,
  initMongo,
  initPostgres,
  interpolateRoute,
  passwordHash,
  pick,
  rand,
  randInt,
  readJson,
  sequelize,
  upsertUser,
};
