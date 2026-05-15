const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  addRoutePoint,
  getRouteDetail,
  getRouteHistory,
  routesToCsv,
} = require('../services/routeHistory');

router.use(authenticate);

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Failed to process route history request' : err.message });
}

// GET /api/route-history
router.get('/', async (req, res) => {
  try {
    const data = await getRouteHistory(req.query, req.user);
    res.json(data);
  } catch (err) {
    console.error('Route history error:', err.message);
    handleError(res, err);
  }
});

// GET /api/route-history/export
router.get('/export', async (req, res) => {
  try {
    const data = await getRouteHistory({ ...req.query, page: 1, limit: 100 }, req.user);
    const csv = routesToCsv(data.routes);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="route-history.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Route history export error:', err.message);
    handleError(res, err);
  }
});

// GET /api/route-history/:id
router.get('/:id', async (req, res) => {
  try {
    const route = await getRouteDetail(req.params.id, req.user);
    res.json(route);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/route-history/:id/playback
router.get('/:id/playback', async (req, res) => {
  try {
    const route = await getRouteDetail(req.params.id, req.user);
    res.json({
      id: route.id,
      taskId: route.taskId,
      coordinates: route.coordinates,
      stops: route.stops,
      distance: route.distance,
      durationMinutes: route.durationMinutes,
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/route-history/:id/points
router.post('/:id/points', async (req, res) => {
  try {
    if (!['admin', 'driver'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Route tracking access required' });
    }

    const point = await addRoutePoint(req.params.id, req.body, req.user);
    res.status(201).json(point);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
