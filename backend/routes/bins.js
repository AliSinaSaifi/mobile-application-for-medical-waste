const router  = require('express').Router();
const axios   = require('axios');
const History = require('../models/mongo/History');

// GET /api/bins — latest reading per bin
router.get('/', async (req, res) => {
  try {
    const bins = await History.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$binId', fullness: { $first: '$fullness' }, timestamp: { $first: '$timestamp' } } },
    ]);
    res.json(bins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bins/history/:binId
router.get('/history/:binId', async (req, res) => {
  try {
    const data = await History
      .find({ binId: req.params.binId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bins/predict/:binId
router.get('/predict/:binId', async (req, res) => {
  try {
    const { binId } = req.params;
    const data = await History.find({ binId }).sort({ timestamp: -1 }).limit(20);

    if (data.length < 2) {
      return res.json({ binId, target_timestamp: Math.floor(Date.now() / 1000) + 7200, confidence: 85, hours_until_full: 2, note: 'fallback — not enough history' });
    }

    const history = data.map(i => [i.fullness, new Date(i.timestamp).getTime() / 1000]);

    try {
      const { data: pyData } = await axios.post('http://localhost:8000/predict', { history }, { timeout: 2000 });
      return res.json({ binId, ...pyData });
    } catch {
      return res.json({ binId, target_timestamp: Math.floor(Date.now() / 1000) + 3600, confidence: 94, hours_until_full: 2.5, note: 'AI offline, showing fallback' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;