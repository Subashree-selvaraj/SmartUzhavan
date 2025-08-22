const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const axios = require('axios');

// Optional auth middleware already defined in server; we will export and reuse if needed

router.post('/weather', async (req, res) => {
	try {
		const { message, city } = req.body || {};
		if (!message || typeof message !== 'string') {
			return res.status(400).json({ error: 'message required' });
		}

		if (!admin.apps.length) {
			return res.status(503).json({ error: 'Messaging unavailable' });
		}

		// If server has Firestore access via admin, retrieve tokens from users collection
		const db = admin.firestore ? admin.firestore() : null;
		let tokens = [];
		let smsNumbers = [];
		let smsEnabled = process.env.ENABLE_SMS_ALERTS === 'true';

		if (db) {
			const usersSnap = await db.collection('users').get();
			usersSnap.forEach(doc => {
				const data = doc.data() || {};
				if (Array.isArray(data.webPushTokens)) {
					tokens = tokens.concat(data.webPushTokens.filter(Boolean));
				}
				if (data.phoneNumber) {
					smsNumbers.push(String(data.phoneNumber));
				}
			});
		}

		// Deduplicate tokens
		tokens = Array.from(new Set(tokens)).slice(0, 500);

		const payload = {
			notification: {
				title: 'Weather Alert',
				body: message
			},
			data: {
				url: '/weather',
				city: String(city || '')
			}
		};

		let fcmResult = null;
		if (tokens.length > 0) {
			fcmResult = await admin.messaging().sendEachForMulticast({ tokens, ...payload });
		}

		let smsResult = { sent: 0 };
		if (smsEnabled && smsNumbers.length > 0) {
			const endpoint = process.env.TEXTBELT_URL || 'https://textbelt.com/text';
			const apiKey = process.env.TEXTBELT_KEY || 'textbelt'; // free key
			const toSend = smsNumbers.slice(0, 50); // limit free tier
			for (const number of toSend) {
				try {
					await axios.post(endpoint, {
						phone: number,
						message,
						key: apiKey
					});
					smsResult.sent += 1;
				} catch (_) {}
			}
		}

		return res.json({ ok: true, fcm: fcmResult, sms: smsResult });
	} catch (err) {
		console.error('POST /alerts/weather error:', err);
		return res.status(500).json({ error: 'internal_error' });
	}
});

module.exports = router; 