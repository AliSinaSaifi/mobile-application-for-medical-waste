const express    = require('express');
const http       = require('http');
const cors       = require('cors');
require('dotenv').config();

const { connectPostgres, connectMongo, connectRedis } = require('./config/db');
const { initSocket } = require('./services/socket');

require('./models/pg/User');
require('./models/pg/Driver');
require('./models/pg/Task');
require('./models/pg/Container');
require('./models/pg/Utilizer');

const app    = express();
const server = http.createServer(app); // ← http server для Socket.io

const isEnabled = (value, defaultValue = true) => {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

const isPrivateLanHost = (hostname) => {
  return (
    /^localhost$/i.test(hostname) ||
    /^127\.0\.0\.1$/.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

// ── Middlewares ───────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);

    try {
      const parsed = new URL(origin);
      const isAllowedPort = ['5173', '5174'].includes(parsed.port);
      if (isAllowedPort && isPrivateLanHost(parsed.hostname)) {
        return callback(null, true);
      }
    } catch (error) {
      // fall through to default deny
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Connect all databases ─────────────────────────────────────
if (isEnabled(process.env.ENABLE_POSTGRES, true)) connectPostgres();
if (isEnabled(process.env.ENABLE_MONGO, true)) connectMongo();
if (isEnabled(process.env.ENABLE_REDIS, true)) connectRedis();

// ── Init Socket.io ────────────────────────────────────────────
initSocket(server);

// ── Routes ────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('MedWaste API is running...'));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/telemetry',     require('./routes/telemetry'));
app.use('/api/bins',          require('./routes/bins'));
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/drivers',       require('./routes/drivers'));
app.use('/api/utilizers',     require('./routes/utilizers'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/utilizer',      require('./routes/utilizer'));

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));