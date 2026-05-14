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

async function ensureUserProfileColumns() {
  if (!sequelize) return;

  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('users');

  const addIfMissing = async (columnName, spec) => {
    const exists = Object.keys(table).some((k) => k.toLowerCase() === columnName.toLowerCase());
    if (exists) return;
    await queryInterface.addColumn('users', columnName, spec);
    table[columnName] = spec;
    console.log(`✅ Added users.${columnName}`);
  };

  // Ensure fullName exists (may be missing on very old installs)
  await addIfMissing('fullName', {
    type: Sequelize.STRING(255),
    allowNull: false,
    defaultValue: '',
  });

  // Add username (initially nullable) so we can backfill without breaking existing rows
  await addIfMissing('username', {
    type: Sequelize.STRING(60),
    allowNull: true,
  });

  // Backfill usernames for existing users that lack one and create case-insensitive unique index
  try {
    const [rows] = await sequelize.query('SELECT id, "fullName", username, email FROM users');
    const existingUsernames = new Set();
    rows.forEach(r => {
      if (r.username) existingUsernames.add(String(r.username).toLowerCase());
    });

    const slugify = (s) => {
      if (!s) return '';
      let t = String(s).toLowerCase();
      t = t.replace(/[^a-z0-9_-]+/g, '_');
      t = t.replace(/^_+|_+$/g, '');
      if (t.length > 30) t = t.slice(0, 30);
      return t || '';
    };

    for (const r of rows) {
      if (!r.username || String(r.username).trim() === '') {
        let base = slugify(r.fullName || (r.email ? r.email.split('@')[0] : 'user'));
        if (base.length < 3) base = `${base}${r.id}`;
        let candidate = base;
        let suffix = 1;
        while (existingUsernames.has(candidate.toLowerCase())) {
          candidate = `${base}${suffix}`;
          suffix++;
        }
        await sequelize.query('UPDATE users SET username = :u WHERE id = :id', { replacements: { u: candidate, id: r.id } });
        existingUsernames.add(candidate.toLowerCase());
        console.log(`🔧 Backfilled username for user ${r.id}: ${candidate}`);
      }
    }

    // Create a case-insensitive unique index on lower(username)
    await queryInterface.sequelize.query("CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));");
    console.log('✅ Created unique index users_username_lower_idx on lower(username)');

    // Make username NOT NULL now that we've backfilled values
    try {
      await queryInterface.changeColumn('users', 'username', { type: Sequelize.STRING(60), allowNull: false });
      console.log('✅ Set users.username to NOT NULL');
    } catch (e) {
      console.warn('⚠️ Could not set users.username NOT NULL:', e.message);
    }
  } catch (e) {
    console.warn('⚠️ Username backfill/index step failed:', e.message);
  }

  await addIfMissing('department', {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  await addIfMissing('phoneNumber', {
    type: Sequelize.STRING(20),
    allowNull: true,
  });

  await addIfMissing('phoneVerified', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await addIfMissing('otpHash', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });

  await addIfMissing('otpExpiresAt', {
    type: Sequelize.DATE,
    allowNull: true,
  });

  await addIfMissing('otpAttempts', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await addIfMissing('otpResendCount', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await addIfMissing('otpLastSentAt', {
    type: Sequelize.DATE,
    allowNull: true,
  });

  await addIfMissing('otpResendWindowStartedAt', {
    type: Sequelize.DATE,
    allowNull: true,
  });

  await addIfMissing('otpLockedUntil', {
    type: Sequelize.DATE,
    allowNull: true,
  });
}

async function connectPostgres() {
  if (!sequelize) {
    console.warn('⚠️  POSTGRES_URI/DATABASE_URL not set — PostgreSQL is disabled');
    return;
  }
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    await ensureUserProfileColumns();
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
