const { redisClient } = require('../config/db');

const SESSION_TTL = 60 * 60 * 24;
const DRIVER_TTL = 60 * 5;

async function saveSession(userId, token) {
  if (!redisClient) return;
  await redisClient.setEx(`session:${userId}`, SESSION_TTL, token);
}

async function getSession(userId) {
  if (!redisClient) return null;
  return await redisClient.get(`session:${userId}`);
}

async function deleteSession(userId) {
  if (!redisClient) return;
  await redisClient.del(`session:${userId}`);
}

async function setDriverAvailable(driverId, isAvailable) {
  if (!redisClient) return;
  await redisClient.setEx(
    `driver:available:${driverId}`,
    DRIVER_TTL,
    isAvailable ? '1' : '0'
  );
}

async function getDriverAvailable(driverId) {
  if (!redisClient) return null;
  const val = await redisClient.get(`driver:available:${driverId}`);
  return val === null ? null : val === '1';
}

/** When Redis is off, allow telemetry (no in-memory limiter here). */
async function checkTelemetryRateLimit(binId) {
  if (!redisClient || !redisClient.isOpen) return true;
  const key = `ratelimit:telemetry:${binId}`;
  try {
    const exists = await redisClient.get(key);
    if (exists) return false;
    await redisClient.setEx(key, 3, '1');
    return true;
  } catch (err) {
    console.warn(`Telemetry rate limiter unavailable for qrCode=${binId}: ${err.message}`);
    return true;
  }
}

module.exports = {
  saveSession,
  getSession,
  deleteSession,
  setDriverAvailable,
  getDriverAvailable,
  checkTelemetryRateLimit,
};
