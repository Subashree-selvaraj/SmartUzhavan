require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');

const authRoutes = require('./routes/auth');
const schemesRoutes = require('./routes/schemes');
const predictRoutes = require('./routes/predict');
const diseaseReportsRoutes = require('./routes/diseaseReports');
const outbreakRoutes = require('./routes/outbreak');

const admin = require('firebase-admin');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      const envOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
      const defaultOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://0.0.0.0:3000',
        'http://localhost:3001'
      ];
      const allowed = envOrigins.length > 0 ? envOrigins : defaultOrigins;
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST']
  }
});

// Attach io to app for use in routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agriconnect';
mongoose.connect(mongoUri)
.then(() => {
  console.log('Connected to MongoDB');
  // Start weekly scheduler after DB connection
  const { startScheduler } = require('./scheduler');
  startScheduler();
})
.catch(err => console.error('MongoDB connection error:', err));

// Initialize Firebase Admin SDK (using service account info from env variables)
try {
  if (!admin.apps.length) {
    const requiredFirebaseEnv = {
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID
    };

    const hasAllCreds = Object.values(requiredFirebaseEnv).every(v => typeof v === 'string' && v.trim().length > 0);

    if (hasAllCreds) {
      const serviceAccount = {
        type: 'service_account',
        project_id: 'project-kissan-48284',
        private_key_id: requiredFirebaseEnv.privateKeyId,
        private_key: requiredFirebaseEnv.privateKey,
        client_email: requiredFirebaseEnv.clientEmail,
        client_id: requiredFirebaseEnv.clientId,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'project-kissan-48284'
      });

      console.log('Firebase Admin initialized successfully');
    } else {
      console.warn('Firebase Admin not configured. Skipping Firebase initialization.');
    }
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
}

// CORS configuration - ONLY ONCE before any routes/middleware
const envOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
const allowedOrigins = envOrigins.length > 0 ? envOrigins : [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://0.0.0.0:3000',
  'http://localhost:3001'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Middleware
app.use(bodyParser.json());
// Serve React build assets
const buildPath = path.join(__dirname, '../folder1/build');
app.use(express.static(buildPath));

// Firebase authentication middleware: required auth
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  if (!admin.apps.length) {
    return res.status(503).json({ error: 'Auth service unavailable' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Firebase authentication middleware: optional auth
const optionalFirebaseAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && admin.apps.length) {
    const token = authHeader.split(' ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
    } catch (error) {
      console.error('Optional auth error:', error);
      // Continue without setting req.user if token invalid
    }
  }
  next();
};

// Mock data storage
let mockData = {
  crops: {
    rice: { basePrice: 2300 },
    tomato: { basePrice: 6500 },
    onion: { basePrice: 3800 },
    potato: { basePrice: 2100 },
    brinjal: { basePrice: 3000 },
    banana: { basePrice: 2800 },
    sugarcane: { basePrice: 3500 },
    coconut: { basePrice: 3200 },
    cotton: { basePrice: 8000 },
    groundnut: { basePrice: 5500 }
  },
  districts: ['chennai', 'coimbatore', 'madurai', 'trichy', 'salem', 'tirunelveli', 'vellore', 'erode', 'thanjavur', 'dindigul'],
  queries: []
};


// Price data generator
function generatePriceData(crop, days) {
  const priceData = [];
  const today = new Date();
  const basePrice = mockData.crops[crop]?.basePrice || 2500;

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    // Random fluctuation
    const fluctuation = basePrice * (0.95 + Math.random() * 0.1);

    // Trend up for last half of days
    let trend = 0;
    if (i < days/2) {
      trend = basePrice * 0.002 * (days - i);
    }

    const price = Math.round(fluctuation + trend);

    priceData.push({
      date: date.toISOString().split('T')[0],
      price
    });
  }

  return priceData;
}

// District price generator
function generateDistrictData(crop) {
  const districtData = [];
  const basePrice = mockData.crops[crop]?.basePrice || 2500;

  mockData.districts.forEach(district => {
    const districtFactor = 0.9 + Math.random() * 0.2;
    const districtPrice = Math.round(basePrice * districtFactor);
    districtData.push({ district, price: districtPrice });
  });

  // Add avg price as 'all'
  const avgPrice = Math.round(districtData.reduce((sum, d) => sum + d.price, 0) / districtData.length);
  districtData.unshift({ district: 'all', price: avgPrice });

  return districtData;
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schemes', schemesRoutes);
app.use('/api', predictRoutes);
app.use('/api/diseaseReports', diseaseReportsRoutes);
app.use('/api/outbreak', outbreakRoutes);

// SPA fallback: send index.html for non-API routes so client-side routing works
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  return res.sendFile(path.join(buildPath, 'index.html'));
});

app.get('/api/prices', (req, res) => {
  const { crop, district } = req.query;
  if (!crop) return res.status(400).json({ error: 'Crop parameter is required' });

  const districtData = generateDistrictData(crop);

  if (district && district !== 'all') {
    const districtPrice = districtData.find(d => d.district === district);
    return res.json({ district, crop, price: districtPrice?.price || 'Not available' });
  }

  res.json({ crop, districtData });
});

app.get('/api/trends', (req, res) => {
  const { crop, days = 7 } = req.query;
  if (!crop) return res.status(400).json({ error: 'Crop parameter is required' });

  const priceData = generatePriceData(crop, parseInt(days, 10));
  res.json({ crop, priceData });
});

app.post('/api/submit-query', (req, res) => {
  const { name, crop, location, mobile, comments } = req.body;
  if (!name || !crop || !location || !mobile) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = {
    id: Date.now(),
    name,
    crop,
    location,
    mobile,
    comments: comments || '',
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  mockData.queries.push(query);

  // Normally save to DB
  res.status(201).json({ success: true, queryId: query.id });
});

// Chat endpoint for AgriChatbot with optional Firebase auth
app.post('/api/chat', optionalFirebaseAuth, async (req, res) => {
  try {
    const { message, language } = req.body;
    const userId = req.user?.uid || 'anonymous';

    console.log(`Chat from user ${userId}: ${message}`);

    let response = `Thank you for your message: "${message}". I'm an agricultural assistant here to help you with farming questions.`;
    if (language === 'ta') {
      response = `உங்கள் செய்திக்கு நன்றி: "${message}". நான் ஒரு விவசாய உதவியாளர், விவசாய கேள்விகளுக்கு உதவ இங்கே இருக்கிறேன்.`;
    }

    res.json({ response, userId });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat service error' });
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const contactEntry = {
      id: Date.now(),
      name,
      email,
      phone: phone || '',
      subject,
      message,
      timestamp: new Date().toISOString(),
      status: 'new'
    };

    console.log('Contact form submission:', contactEntry);

    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully',
      id: contactEntry.id
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Contact form submission failed' });
  }
});

// Azure Text-to-Speech endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, language = 'en-US' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION || 'centralindia';

    if (!azureKey) {
      console.error('Azure Speech Key not found in environment variables');
      return res.status(500).json({ error: 'Azure Speech service not configured' });
    }

    let voiceName = 'en-US-AriaNeural';
    if (language === 'ta-IN') voiceName = 'ta-IN-PallaviNeural';

    // Escape special characters for SSML
    const cleanText = text.replace(/[<>&"']/g, (match) => {
      switch (match) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return match;
      }
    });

    const ssml = `
      <speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" xml:lang="${language}">
        <voice name="${voiceName}">
          ${cleanText}
        </voice>
      </speak>
    `;

    console.log(`Making Azure TTS request for language: ${language}, voice: ${voiceName}`);

    const response = await axios({
      method: 'POST',
      url: `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      data: ssml,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': response.data.length,
      'Cache-Control': 'no-cache'
    });

    res.send(response.data);

  } catch (error) {
    console.error('Azure TTS Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Text-to-speech service failed',
      details: error.response?.status || error.message
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});