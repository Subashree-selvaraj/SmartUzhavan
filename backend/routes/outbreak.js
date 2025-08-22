const express = require('express');
const router = express.Router();
const OutbreakReport = require('../models/outbreakReport');

// POST /api/outbreak/report
router.post('/report', async (req, res) => {
  try {
    const { cropType, diseaseName, location } = req.body;
    if (!cropType || !diseaseName || !location || !location.district) {
      return res.status(400).json({ error: 'CropType, diseaseName, and district are required' });
    }

    const report = new OutbreakReport({ cropType, diseaseName, location });
    await report.save();

    res.json({ success: true, message: 'Outbreak report submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/outbreak/outbreaks?district=DistrictName
router.get('/outbreaks', async (req, res) => {
  try {
    const district = req.query.district;
    const dateLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

    const filter = { date: { $gte: dateLimit } };
    if (district) filter['location.district'] = district;

    const outbreaks = await OutbreakReport.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { diseaseName: '$diseaseName', district: '$location.district' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(outbreaks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
