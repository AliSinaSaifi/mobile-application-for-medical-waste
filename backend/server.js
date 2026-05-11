const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { connectPostgres, connectMongo, connectRedis } = require('./config/db');
const { initSocket } = require('./services/Socket');
const { buildAllowedOrigins, createCorsOriginCallback } = require('./config/cors');

// Only load Sequelize models when a Postgres URI is actually configured.
// The models call sequelize.define() at module load time; requiring them
// when sequelize is null crashes the process before any env-flag check runs.
if (process.env.POSTGRES_URI) {
  require('./models/pg/User');
  require('./models/pg/Driver');
  require('./models/pg/Task');
  require('./models/pg/Container');
  require('./models/pg/Utilizer');
}

const app = express();
const server = http.createServer(app);

const isEnabled = (value, defaultValue = true) => {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const allowedOrigins = buildAllowedOrigins();
if (allowedOrigins.length === 0) {
  console.warn(
    '⚠️  No CLIENT_URL (or CORS_EXTRA_ORIGINS) configured — browser CORS requests will be rejected until you set allowed origins.'
  );
}

app.use(
  cors({
    origin: createCorsOriginCallback(allowedOrigins),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

if (isEnabled(process.env.ENABLE_POSTGRES, true)) connectPostgres();
if (isEnabled(process.env.ENABLE_MONGO, true)) connectMongo();
if (isEnabled(process.env.ENABLE_REDIS, true)) connectRedis();

initSocket(server, { allowedOrigins });

app.get('/', (req, res) => res.send('MedWaste API is running...'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/bins', require('./routes/bins'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/utilizers', require('./routes/utilizers'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/utilizer', require('./routes/utilizer'));

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server listening on ${HOST}:${PORT}`);
});
