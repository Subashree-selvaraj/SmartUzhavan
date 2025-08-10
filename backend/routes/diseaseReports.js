
const express = require('express');
const router = express.Router();
const DiseaseReport = require('../models/DiseaseReport');

// POST /api/diseaseReports - Save a new disease report
router.post('/', async (req, res) => {
  try {
    const { farmerName, cropName, diseaseName, severity, imageUrl, latitude, longitude, reportedBy } = req.body;

    // Validate required fields
    if (!cropName || !diseaseName || !severity || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields: cropName, diseaseName, severity, latitude, longitude' });
    }

    // Create new disease report
    const diseaseReport = new DiseaseReport({
      farmerName: farmerName || "Anonymous",
      cropName,
      diseaseName,
      severity,
      imageUrl,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)] // [lng, lat]
      },
      reportedBy: reportedBy || "anonymous"
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
            type: "Point",
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

module.exports = router;
