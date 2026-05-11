const { redisClient } = require('../config/db');

const SESSION_TTL = 60 * 60 * 24; // 24 hours
const DRIVER_TTL  = 60 * 5;       // 5 minutes

async function saveSession(userId, token) {
  await redisClient.setEx(`session:${userId}`, SESSION_TTL, token);
}

async function getSession(userId) {
  return await redisClient.get(`session:${userId}`);
}

async function deleteSession(userId) {
  await redisClient.del(`session:${userId}`);
}

async function setDriverAvailable(driverId, isAvailable) {
  await redisClient.setEx(
    `driver:available:${driverId}`,
    DRIVER_TTL,
    isAvailable ? '1' : '0'
  );
}

async function getDriverAvailable(driverId) {
  const val = await redisClient.get(`driver:available:${driverId}`);
  return val === null ? null : val === '1';
}

async function checkTelemetryRateLimit(binId) {
  const key    = `ratelimit:telemetry:${binId}`;
  const exists = await redisClient.get(key);
  if (exists) return false;
  await redisClient.setEx(key, 3, '1');
  return true;
}

module.exports = {
  saveSession,
  getSession,
  deleteSession,
  setDriverAvailable,
  getDriverAvailable,
  checkTelemetryRateLimit,
};