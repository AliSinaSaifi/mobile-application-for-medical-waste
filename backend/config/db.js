const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const redis = require('redis');
require('dotenv').config();

const postgresUri = process.env.POSTGRES_URI || process.env.DATABASE_URL;

// ── PostgreSQL ─────────────────────────────────────────────────
// Sequelize throws synchronously when the URI is undefined, so guard it.
const sequelize = postgresUri
  ? new Sequelize(postgresUri, { dialect: 'postgres', logging: false })
  : null;

async function connectPostgres() {
  if (!sequelize) {
    console.warn('⚠️  POSTGRES_URI/DATABASE_URL not set — PostgreSQL is disabled');
    return;
  }
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ PostgreSQL Error:', err.message);
  }
}

// ── MongoDB ───────────────────────────────────────────────────
async function connectMongo() {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️  MONGO_URI not set — MongoDB is disabled');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
  }
}

// ── Redis ─────────────────────────────────────────────────────
let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.error('❌ Redis error:', err.message));
}

async function connectRedis() {
  if (!redisClient) {
    console.warn('⚠️  REDIS_URL not set — Redis session / rate-limit features are disabled');
    return;
  }
  try {
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('❌ Redis error:', err.message);
  }
}

module.exports = { sequelize, redisClient, connectPostgres, connectMongo, connectRedis };
