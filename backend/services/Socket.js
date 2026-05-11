const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createCorsOriginCallback } = require('../config/cors');

const SECRET = process.env.JWT_SECRET || 'supersecretkey';

let io;

function initSocket(httpServer, options = {}) {
  const allowedOrigins = options.allowedOrigins || [];

  io = new Server(httpServer, {
    cors: {
      origin: createCorsOriginCallback(allowedOrigins),
      methods: ['GET', 'POST'],
    },
  });

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

  io.on('connection', (socket) => {
    const { userId, role } = socket.user;
    console.log(`🔌 Connected: userId=${userId} role=${role}`);

    socket.join(`role:${role}`);
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: userId=${userId}`);
    });
  });

  return io;
}

function emitTelemetry(binId, fullness, timestamp) {
  if (!io) return;
  io.emit('telemetry:update', { binId, fullness, timestamp });
}

function emitAlert(alert) {
  if (!io) return;
  io.to('role:admin').to('role:personnel').emit('alert:new', alert);
}

function emitTaskToDriver(userId, task) {
  if (!io) return;
  io.to(`user:${userId}`).emit('task:assigned', task);
}

function emitTaskUpdate(task) {
  if (!io) return;
  io.to('role:admin').emit('task:updated', task);
}

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
