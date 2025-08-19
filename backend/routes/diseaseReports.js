
const express = require('express');
const router = express.Router();
const DiseaseReport = require('../models/DiseaseReport');

// Microsoft Translator API configuration
const MS_TRANSLATOR_API_KEY = process.env.AZURE_TRANSLATOR_KEY || '7b55hs2ooc2j1qKh8ZPIsd8uWZSnmZ7kGmGWoctle7kYjL4dVmoNJQQJ99BGACGhslBXJ3w3AAAbACOG3AST';
const MS_TRANSLATOR_REGION = process.env.AZURE_TRANSLATOR_REGION || 'centralindia';

// Function to translate text using Microsoft Translator API
async function translateText(text, toLang = 'ta', fromLang = 'en') {
  if (!text || text.trim() === '') return '';
  
  try {
    const endpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';
    const url = `${endpoint}&from=${fromLang}&to=${toLang}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': MS_TRANSLATOR_API_KEY,
        'Ocp-Apim-Subscription-Region': MS_TRANSLATOR_REGION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ Text: text }])
    });

    if (!response.ok) {
      console.warn('Translation API error:', response.status);
      return text; // Return original text if translation fails
    }

    const data = await response.json();
    return data[0]?.translations[0]?.text || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text if translation fails
  }
}

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

    // Translate crop name and disease name to Tamil
    const cropName_ta = await translateText(cropName, 'ta', 'en');
    const diseaseName_ta = await translateText(diseaseName, 'ta', 'en');

    // Create new disease report with both languages
    const diseaseReport = new DiseaseReport({
      farmerName: farmerName || 'Anonymous',
      // English fields
      cropName_en: cropName,
      diseaseName_en: diseaseName,
      // Tamil fields
      cropName_ta: cropName_ta,
      diseaseName_ta: diseaseName_ta,
      // Legacy fields for backward compatibility
      cropName: cropName,
      diseaseName: diseaseName,
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

// POST /api/diseaseReports/migrate - Migrate existing reports to include both languages
router.post('/migrate', async (req, res) => {
  try {
    // Find all reports that don't have Tamil translations
    const reportsToMigrate = await DiseaseReport.find({
      $or: [
        { cropName_ta: { $exists: false } },
        { diseaseName_ta: { $exists: false } },
        { cropName_en: { $exists: false } },
        { diseaseName_en: { $exists: false } }
      ]
    });

    let migratedCount = 0;
    
    for (const report of reportsToMigrate) {
      try {
        // Translate crop name to Tamil if not exists
        if (!report.cropName_ta && report.cropName) {
          report.cropName_ta = await translateText(report.cropName, 'ta', 'en');
        }
        
        // Translate disease name to Tamil if not exists
        if (!report.diseaseName_ta && report.diseaseName) {
          report.diseaseName_ta = await translateText(report.diseaseName, 'ta', 'en');
        }
        
        // Set English fields if not exists
        if (!report.cropName_en && report.cropName) {
          report.cropName_en = report.cropName;
        }
        
        if (!report.diseaseName_en && report.diseaseName) {
          report.diseaseName_en = report.diseaseName;
        }
        
        await report.save();
        migratedCount++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error migrating report ${report._id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Migrated ${migratedCount} reports to include both languages`,
      totalReports: reportsToMigrate.length,
      migratedCount
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
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
      limit = 100,
      lang = 'en' // Default to English if no language specified
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

    // Get distinct values for filters based on language
    const distinctCrops = await DiseaseReport.distinct(lang === 'ta' ? 'cropName_ta' : 'cropName_en');
    const distinctDiseases = await DiseaseReport.distinct(lang === 'ta' ? 'diseaseName_ta' : 'diseaseName_en');

    // Map reports to return language-specific data
    const mappedReports = reports.map(report => ({
      _id: report._id,
      farmerName: report.farmerName,
      cropName: lang === 'ta' ? report.cropName_ta : report.cropName_en,
      diseaseName: lang === 'ta' ? report.diseaseName_ta : report.diseaseName_en,
      severity: report.severity,
      imageUrl: report.imageUrl,
      location: report.location,
      dateReported: report.dateReported,
      reportedBy: report.reportedBy,
      reporterEmail: report.reporterEmail,
      reporterPhone: report.reporterPhone
    }));

    res.json({
      success: true,
      data: mappedReports,
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
    const { lat, lng, radiusKm = 50, lang = 'en' } = req.query;

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

    // Map reports to return language-specific data
    const mappedReports = nearbyReports.map(report => ({
      _id: report._id,
      farmerName: report.farmerName,
      cropName: lang === 'ta' ? report.cropName_ta : report.cropName_en,
      diseaseName: lang === 'ta' ? report.diseaseName_ta : report.diseaseName_en,
      severity: report.severity,
      imageUrl: report.imageUrl,
      location: report.location,
      dateReported: report.dateReported,
      reportedBy: report.reportedBy,
      reporterEmail: report.reporterEmail,
      reporterPhone: report.reporterPhone
    }));

    res.json({
      success: true,
      data: mappedReports,
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
