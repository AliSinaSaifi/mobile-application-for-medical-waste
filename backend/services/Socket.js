const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createCorsOriginCallback } = require('../config/cors');

const SECRET = process.env.JWT_SECRET;

let io;
const telemetryEmitState = new Map();
const TELEMETRY_EMIT_MIN_INTERVAL_MS = Number(process.env.TELEMETRY_SOCKET_THROTTLE_MS) || 1000;

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
    console.log(`Socket connected: userId=${userId} role=${role}`);

    socket.join(`role:${role}`);
    socket.join(`user:${userId}`);

    socket.on('route:subscribe', (routeId) => {
      const id = Number(routeId);
      if (Number.isInteger(id) && id > 0) socket.join(`route:${id}`);
    });

    socket.on('route:unsubscribe', (routeId) => {
      const id = Number(routeId);
      if (Number.isInteger(id) && id > 0) socket.leave(`route:${id}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: userId=${userId}`);
    });
  });

  return io;
}

function emitTelemetry(binId, fullness, timestamp) {
  if (!io) return;
  const key = String(binId);
  const now = Date.now();
  const last = telemetryEmitState.get(key);
  const payload = { binId, fullness, timestamp };

  if (last && now - last.emittedAt < TELEMETRY_EMIT_MIN_INTERVAL_MS) {
    if (last.timeout) clearTimeout(last.timeout);
    const delay = TELEMETRY_EMIT_MIN_INTERVAL_MS - (now - last.emittedAt);
    const timeout = setTimeout(() => {
      const state = telemetryEmitState.get(key);
      if (!state?.payload) return;
      telemetryEmitState.set(key, { emittedAt: Date.now(), payload: null, timeout: null });
      io.emit('telemetry:update', state.payload);
    }, delay);
    telemetryEmitState.set(key, { emittedAt: last.emittedAt, payload, timeout });
    return;
  }

  telemetryEmitState.set(key, { emittedAt: now, payload: null, timeout: null });
  io.emit('telemetry:update', payload);
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

function emitRoutePoint(routeId, payload) {
  if (!io) return;
  io.to(`route:${routeId}`).to('role:admin').to('role:personnel').emit('route:point', payload);
}

function emitRouteStatus(routeId, payload) {
  if (!io) return;
  io.to(`route:${routeId}`).to('role:admin').to('role:personnel').emit('route:status', payload);
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
  emitRoutePoint,
  emitRouteStatus,
  emitNotification,
};
