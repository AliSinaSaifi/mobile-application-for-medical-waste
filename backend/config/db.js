const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const redis = require('redis');
require('dotenv').config();

const sequelize = new Sequelize(process.env.POSTGRES_URI, {
  dialect: 'postgres',
  logging: false,
});

async function connectPostgres() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ PostgreSQL Error:', err.message);
  }
}

async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
  }
}

let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.error('❌ Redis error:', err.message));
}

async function connectRedis() {
  if (!redisClient) {
    console.warn('⚠️ REDIS_URL not set — Redis session / rate-limit features are disabled');
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
