const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const DiseaseSuggestion = require('../models/DiseaseSuggestion');
const router = express.Router();
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer in-memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// POST /api/predict
router.post('/predict', upload.single('image'), async (req, res) => {
  try {
    const currentLang = req.query.lang || 'en';
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }

    // Step 1: Upload image to Cloudinary
    const cloudinaryRes = await cloudinary.uploader.upload_stream(
      { folder: 'plant-disease' },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ error: 'Image upload failed.' });
        }

        const imageUrl = result.secure_url;
        console.log('Image uploaded to Cloudinary:', imageUrl);

        // Step 2: GPT Vision Classification
        const gptResponse = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'openai/gpt-4o-mini',
            response_format: { type: "json_object" },
            messages: [
              { role: 'system', content: 'You are an agricultural plant disease identifier.' },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Look at the image and return ONLY JSON: { "crop": "<crop>", "disease": "<disease>" }' },
                  { type: 'image_url', image_url: imageUrl }
                ]
              }
            ],
            temperature: 0,
            max_tokens: 100
          },
          {
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        let crop = 'Unknown';
        let disease = 'Unknown';
        try {
          const parsed = JSON.parse(gptResponse.data.choices[0].message.content);
          crop = parsed.crop || crop;
          disease = parsed.disease || disease;
        } catch (e) {
          console.error('JSON parse failed:', gptResponse.data);
        }

        console.log('Predicted crop:', crop);
        console.log('Predicted disease:', disease);

        // Step 3: MongoDB Suggestion Lookup
        const suggestionDoc = await DiseaseSuggestion.findOne({ disease: new RegExp(`^${disease}$`, 'i') });
        const suggestion = suggestionDoc
          ? { en: suggestionDoc.suggestion_en, ta: suggestionDoc.suggestion_ta }
          : {
              en: 'No specific suggestion found. Please consult an expert.',
              ta: 'குறிப்பிட்ட பரிந்துரை எதுவும் கிடைக்கவில்லை. ஒரு நிபுணரை அணுகவும்.'
            };

        const crop_ta = suggestionDoc?.crop_ta || '';
        const disease_ta = suggestionDoc?.disease_ta || '';

        // Step 4: YouTube Search
        let videoUrl = null;
        if (YT_API_KEY) {
          const queries = [
            `${crop} ${disease} treatment in Tamil agriculture`,
            `${crop} ${disease} solution Tamil`,
            `${crop} ${disease} treatment in English`,
            `${crop} ${disease} solution`,
            `${disease} disease solution`,
            `${crop} disease help`,
            `${disease} organic treatment`,
            `${crop} plant disease care video`
          ];

          for (const query of queries) {
            try {
              const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                  key: YT_API_KEY,
                  q: query,
                  part: 'snippet',
                  type: 'video',
                  maxResults: 1,
                  videoEmbeddable: 'true'
                }
              });

              const videoId = ytRes.data.items?.[0]?.id?.videoId;
              if (videoId) {
                videoUrl = `https://www.youtube.com/embed/${videoId}`;
                break;
              }
            } catch (err) {
              console.warn('Video search failed for query:', query, err?.response?.data || err.message);
            }
          }

          if (!videoUrl) {
            const fallbackSearch = encodeURIComponent(`${crop} ${disease} plant disease treatment`);
            videoUrl = `https://www.youtube.com/results?search_query=${fallbackSearch}`;
          }
        }

        // Step 5: GPT Expert Advice
        const expertPrompt = `
A farmer has a ${crop} crop suffering from ${disease}.

Please give:
1. A short disease description (2–3 lines)
2. Effective treatment suggestions – include both organic and chemical remedies (Tamil Nadu-approved if possible)
3. Simple preventive tips for future
4. Tamil name of the disease (if known)

Respond in clear, friendly, helpful tone. Keep each section labeled clearly.
`;

        const expertRes = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'openai/gpt-4o',
            messages: [
              { role: 'system', content: 'You are an expert agricultural advisor for Indian farmers.' },
              { role: 'user', content: expertPrompt }
            ],
            max_tokens: 600,
            temperature: 0.7
          },
          {
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const expertAdvice = expertRes.data.choices?.[0]?.message?.content || 'No advice generated.';

        let expertAdviceTamil = null;
        if (currentLang === 'ta') {
          try {
            const translationRes = await axios.post(
              'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=ta',
              [{ Text: expertAdvice }],
              {
                headers: {
                  'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY,
                  'Ocp-Apim-Subscription-Region': process.env.AZURE_TRANSLATOR_REGION,
                  'Content-Type': 'application/json'
                }
              }
            );
            expertAdviceTamil = translationRes.data[0]?.translations[0]?.text;
          } catch (err) {
            console.error('Translation to Tamil failed:', err);
            expertAdviceTamil = null;
          }
        }

        res.json({
          crop,
          crop_ta,
          disease,
          disease_ta,
          suggestion,
          expertAdvice: currentLang === 'ta' && expertAdviceTamil ? expertAdviceTamil : expertAdvice,
          videoUrl
        });
      }
    );

    // Pipe buffer to Cloudinary upload stream
    const stream = cloudinaryRes;
    stream.end(req.file.buffer);

  } catch (err) {
    console.error('Prediction error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Prediction failed. Please try again later.' });
  }
});

module.exports = router;
