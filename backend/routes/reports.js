const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getReportsData, reportsToCsv } = require('../services/reports');

router.use(authenticate);
router.use((req, res, next) => {
  if (!['admin', 'personnel'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Reports access required' });
  }
  next();
});

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const data = await getReportsData(req.query);
    res.json(data);
  } catch (err) {
    console.error('Reports error:', err.message);
    res.status(500).json({ error: 'Failed to build reports data' });
  }
});

// GET /api/reports/export
router.get('/export', async (req, res) => {
  try {
    const data = await getReportsData({ ...req.query, page: 1, limit: 500 });
    const csv = reportsToCsv(data);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="medwaste-report.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Reports export error:', err.message);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

module.exports = router;
