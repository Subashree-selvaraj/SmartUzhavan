const cron = require('node-cron');
const mongoose = require('mongoose');
const scrapeAndTranslate = require('./utils/scrapeAndTranslate');
require('dotenv').config();
const axios = require('axios');

// Connect to MongoDB only if not already connected
if (mongoose.connection.readyState !== 1) {
	mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
}

function startScheduler() {
	// Schedule: Every Sunday at 2:00 AM
	cron.schedule('0 2 * * 0', async () => {
		console.log('Starting weekly scheme scraping...');
		try {
			await scrapeAndTranslate();
			console.log('Schemes updated!');
		} catch (err) {
			console.error('Error during scheduled scraping:', err);
		}
	});

	// Weather risk check: every hour at minute 5
	cron.schedule('5 * * * *', async () => {
		try {
			const apiKey = process.env.WEATHER_API_KEY || process.env.REACT_APP_WEATHER_API_KEY;
			const location = process.env.DEFAULT_WEATHER_LOCATION || 'Chennai';
			if (!apiKey) return;
			const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;
			const { data } = await axios.get(url, { timeout: 8000 });
			const highRisk = detectHighRisk(data);
			if (!highRisk.isHighRisk) return;
			const tips = buildPrecautions(data);
			const message = `High-risk weather in ${data?.name || 'your area'}: ${highRisk.risks.join(', ')}. Precautions: ${tips.join('; ')}`;
			await axios.post(`${process.env.API_ORIGIN || 'http://localhost:5000'}/api/alerts/weather`, { message, city: data?.name || '' });
			console.log('Weather alert dispatched');
		} catch (e) {
			console.warn('Weather risk scheduler error:', e?.message || e);
		}
	});

	console.log('Scheduler running. Will update schemes every Sunday at 2:00 AM. Weather checks hourly.');
}

function detectHighRisk(data) {
	try {
		const temp = data?.main?.temp || 0;
		const humidity = data?.main?.humidity || 0;
		const wind = data?.wind?.speed || 0;
		const cond = (data?.weather?.[0]?.main || '').toLowerCase();
		const isHeat = temp >= 38;
		const isCold = temp <= 10;
		const isStorm = cond.includes('thunder') || wind > 12; // ~43 km/h
		const isHeavyRain = cond.includes('rain') && (data?.rain?.['1h'] || data?.rain?.['3h'] || 0) >= 10;
		const isHighHumidity = humidity >= 85;
		const triggered = [];
		if (isHeat) triggered.push('Heat wave');
		if (isCold) triggered.push('Cold stress');
		if (isStorm) triggered.push('Storm risk');
		if (isHeavyRain) triggered.push('Heavy rainfall');
		if (isHighHumidity) triggered.push('High humidity');
		return { isHighRisk: triggered.length > 0, risks: triggered };
	} catch (_) {
		return { isHighRisk: false, risks: [] };
	}
}

function buildPrecautions(data) {
	const tips = [
		'Water Management: Efficient irrigation and rainwater harvesting',
		'Crop Protection: Secure structures and avoid spraying during rain',
		'Soil Health: Apply mulch to regulate soil moisture and temperature'
	];
	const temp = data?.main?.temp || 0;
	if (temp >= 38) tips.unshift('Heat Wave: Increase irrigation and provide shade if possible');
	if ((data?.wind?.speed || 0) > 12) tips.unshift('High Winds: Secure equipment and avoid field work during gusts');
	return Array.from(new Set(tips)).slice(0, 6);
}

// Auto-start only if this file is run directly
if (require.main === module) {
	startScheduler();
}

module.exports = { startScheduler }; 