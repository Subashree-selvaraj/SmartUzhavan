
const express = require('express');
const router = express.Router();
const DiseaseReport = require('../models/DiseaseReport');

// Helper: compute dynamic severity based on nearby density in recent days
async function computeDynamicSeverity({ diseaseName, latitude, longitude, days = 14, radiusKm = 50 }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const earthRadiusKm = 6378.1;
  const radiusInRadians = radiusKm / earthRadiusKm;

  const count = await DiseaseReport.countDocuments({
    diseaseName: new RegExp(`^${diseaseName}$`, 'i'),
    dateReported: { $gte: since },
    location: {
      $geoWithin: {
        $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], radiusInRadians]
      }
    }
  });

  if (count >= 10) return 'severe';
  if (count >= 4) return 'moderate';
  return 'mild';
}

// POST /api/diseaseReports - Save a new disease report
router.post('/', async (req, res) => {
  try {
    const { farmerName, cropName, diseaseName, severity, imageUrl, latitude, longitude, reportedBy, reporterEmail, reporterPhone } = req.body;

    // Validate required fields (severity can be omitted for auto-compute)
    if (!cropName || !diseaseName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields: cropName, diseaseName, latitude, longitude' });
    }

    // Determine severity (auto if not provided)
    let finalSeverity = severity;
    if (!finalSeverity || finalSeverity === 'auto') {
      finalSeverity = await computeDynamicSeverity({
        diseaseName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });
    }

    // Create new disease report
    const diseaseReport = new DiseaseReport({
      farmerName: farmerName || 'Anonymous',
      cropName,
      diseaseName,
      severity: finalSeverity,
      imageUrl,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)] // [lng, lat]
      },
      reportedBy: reportedBy || 'anonymous',
      reporterEmail: reporterEmail || null,
      reporterPhone: reporterPhone || null
    });

    const savedReport = await diseaseReport.save();

    // Emit real-time update to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('newReport', savedReport);
    }

    res.status(201).json({
      success: true,
      data: savedReport
    });

  } catch (error) {
    console.error('Error saving disease report:', error);
    res.status(500).json({ error: 'Failed to save disease report' });
  }
});

// GET /api/diseaseReports - Fetch disease reports with filters
router.get('/', async (req, res) => {
  try {
    const {
      cropName,
      diseaseName,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 100
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (cropName) filter.cropName = new RegExp(cropName, 'i');
    if (diseaseName) filter.diseaseName = new RegExp(diseaseName, 'i');
    if (severity) filter.severity = severity;
    
    // Date filtering
    if (startDate || endDate) {
      filter.dateReported = {};
      if (startDate) filter.dateReported.$gte = new Date(startDate);
      if (endDate) filter.dateReported.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch reports with filters
    const reports = await DiseaseReport.find(filter)
      .sort({ dateReported: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DiseaseReport.countDocuments(filter);

    // Get distinct values for filters
    const distinctCrops = await DiseaseReport.distinct('cropName');
    const distinctDiseases = await DiseaseReport.distinct('diseaseName');

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        crops: distinctCrops,
        diseases: distinctDiseases
      }
    });

  } catch (error) {
    console.error('Error fetching disease reports:', error);
    res.status(500).json({ error: 'Failed to fetch disease reports' });
  }
});

// GET /api/diseaseReports/nearby - Get nearby reports using geospatial query
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 50 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInMeters = parseFloat(radiusKm) * 1000;

    // Geospatial query
    const nearbyReports = await DiseaseReport.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).limit(100);

    res.json({
      success: true,
      data: nearbyReports,
      center: { lat: latitude, lng: longitude },
      radiusKm: parseFloat(radiusKm)
    });

  } catch (error) {
    console.error('Error fetching nearby reports:', error);
    res.status(500).json({ error: 'Failed to fetch nearby reports' });
  }
});

// GET /api/diseaseReports/hotspots - AI-style aggregation of recent common diseases by grid cell
router.get('/hotspots', async (req, res) => {
  try {
    const days = parseInt(req.query.days || '14', 10);
    const cellSize = parseFloat(req.query.cellSize || '0.5'); // degrees
    const minCount = parseInt(req.query.minCount || '3', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Aggregate into grid cells, pick top disease per cell
    const pipeline = [
      { $match: { dateReported: { $gte: since } } },
      {
        $project: {
          diseaseName: 1,
          lat: { $arrayElemAt: ['$location.coordinates', 1] },
          lng: { $arrayElemAt: ['$location.coordinates', 0] },
        }
      },
      {
        $addFields: {
          cellLat: { $multiply: [{ $round: [{ $divide: ['$lat', cellSize] }, 0] }, cellSize] },
          cellLng: { $multiply: [{ $round: [{ $divide: ['$lng', cellSize] }, 0] }, cellSize] }
        }
      },
      {
        $group: {
          _id: { cellLat: '$cellLat', cellLng: '$cellLng', diseaseName: '$diseaseName' },
          count: { $sum: 1 },
          avgLat: { $avg: '$lat' },
          avgLng: { $avg: '$lng' }
        }
      },
      { $match: { count: { $gte: minCount } } },
      {
        $group: {
          _id: { cellLat: '$_id.cellLat', cellLng: '$_id.cellLng' },
          topDisease: { $first: { name: '$_id.diseaseName', count: '$count', lat: '$avgLat', lng: '$avgLng' } },
          total: { $sum: '$count' }
        }
      },
      { $sort: { 'topDisease.count': -1 } },
      {
        $project: {
          _id: 0,
          diseaseName: '$topDisease.name',
          count: '$topDisease.count',
          lat: '$topDisease.lat',
          lng: '$topDisease.lng',
          cellLat: '$_id.cellLat',
          cellLng: '$_id.cellLng',
          totalInCell: '$total'
        }
      }
    ];

    const hotspots = await DiseaseReport.aggregate(pipeline);
    res.json({ success: true, data: hotspots });
  } catch (error) {
    console.error('Error computing hotspots:', error);
    res.status(500).json({ error: 'Failed to compute hotspots' });
  }
});

module.exports = router;
