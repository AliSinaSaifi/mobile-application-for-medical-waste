const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const History    = require('../models/mongo/History');

const SECRET = process.env.JWT_SECRET || 'supersecretkey';

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:  process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // ── Auth middleware ─────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));

    try {
      socket.user = jwt.verify(token, SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ──────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, role } = socket.user;
    console.log(`🔌 Connected: userId=${userId} role=${role}`);

    // Join role-based room
    socket.join(`role:${role}`);
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: userId=${userId}`);
    });
  });

  return io;
}

// ── Emit helpers (called from routes) ────────────────────────

// New telemetry reading — broadcast to all dashboard users
function emitTelemetry(binId, fullness, timestamp) {
  if (!io) return;
  io.emit('telemetry:update', { binId, fullness, timestamp });
}

// New alert — broadcast to admin + personnel
function emitAlert(alert) {
  if (!io) return;
  io.to('role:admin').to('role:personnel').emit('alert:new', alert);
}

// Task assigned — notify specific driver
function emitTaskToDriver(userId, task) {
  if (!io) return;
  io.to(`user:${userId}`).emit('task:assigned', task);
}

// Task status changed — notify admin
function emitTaskUpdate(task) {
  if (!io) return;
  io.to('role:admin').emit('task:updated', task);
}

// Notification — notify specific user
function emitNotification(userId, notification) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
}

module.exports = {
  initSocket,
  emitTelemetry,
  emitAlert,
  emitTaskToDriver,
  emitTaskUpdate,
  emitNotification,
};
