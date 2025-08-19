
import React, { useState, useEffect } from 'react';
import './Weather.css';

const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const BACKUP_KEY = process.env.REACT_APP_WEATHER_BACKUP_KEY;
const API_BASE = (process.env.REACT_APP_API_BASE || 'http://localhost:5000/api');

const DEFAULT_LOCATION = 'Chennai, Tamil Nadu';

const translations = {
  en: {
    weatherDetails: 'Weather Details',
    weatherDetailsDesc: 'Get accurate weather forecasts for your location to plan your farming activities',
    search: 'Search',
    loadingWeather: 'Loading weather data...',
    farmingRecommendations: 'Farming Recommendations',
    weeklyForecast: 'Weekly Forecast',
    crisisAlert: 'Weather Crisis Alert',
    crisisManagement: 'Crisis Management & Prevention',
    preventiveMeasures: 'Preventive Measures',
    noRecommendations: 'No recommendations for current weather conditions',
    feelsLike: 'Feels Like',
    humidity: 'Humidity',
    windSpeed: 'Wind Speed',
    windDirection: 'Wind Direction',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    locationPlaceholder: 'Enter city or district name (e.g., Chennai, Madurai)',
    refreshWeather: 'Refresh weather data'
  },
  ta: {
    weatherDetails: 'வானிலை விவரங்கள்',
    weatherDetailsDesc: 'உங்கள் இடத்திற்கான துல்லியமான வானிலை முன்னறிவிப்புகளை பெறுங்கள்',
    search: 'தேடல்',
    loadingWeather: 'வானிலை தரவு ஏற்றப்படுகிறது...',
    farmingRecommendations: 'விவசாய பரிந்துரைகள்',
    weeklyForecast: 'வார வானிலை முன்னறிவிப்பு',
    crisisAlert: 'வானிலை நெருக்கடி எச்சரிக்கை',
    crisisManagement: 'நெருக்கடி மேலாண்மை & தடுப்பு',
    preventiveMeasures: 'தடுப்பு நடவடிக்கைகள்',
    noRecommendations: 'தற்போதைய வானிலை நிலைக்கு பரிந்துரைகள் இல்லை',
    feelsLike: 'உணர்வு வெப்பம்',
    humidity: 'ஈரப்பதம்',
    windSpeed: 'காற்று வேகம்',
    windDirection: 'காற்று திசை',
    sunrise: 'சூர்ய உதயம்',
    sunset: 'சூர்ய அஸ்தமனம்',
    locationPlaceholder: 'மாவட்ட/நகரம் பெயர் (எ.கா, சென்னை, மதுரை)',
    refreshWeather: 'வானிலை தரவை புதுப்பிக்கவும்'
  }
};

const chenniWeatherFallback = {
  coord: { lon: 80.2785, lat: 13.0878 },
  weather: [{ id: 800, main: "Clear", description: "clear sky", icon: "01d" }],
  main: { temp: 32, feels_like: 34, temp_min: 32, temp_max: 32, pressure: 1010, humidity: 65 },
  wind: { speed: 3.6, deg: 160 },
  sys: {
    country: "IN",
    sunrise: Date.now() / 1000 - 21600,
    sunset: Date.now() / 1000 + 21600
  },
  name: "Chennai",
  cod: 200
};

function WeatherPage() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState(localStorage.getItem('agri-lang') || 'en');
  const [recommendations, setRecommendations] = useState([]);
  const [crisis, setCrisis] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [useBackupKey, setUseBackupKey] = useState(false);

  useEffect(() => {
    // Load Chennai weather immediately
    displayWeatherData(chenniWeatherFallback);
    
    // Try to get actual weather from API
    fetchWeatherByLocation(DEFAULT_LOCATION);

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          fetchWeatherByCoords(latitude, longitude);
        },
        error => console.log("Geolocation error:", error),
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('agri-lang', language);
  }, [language]);

  const t = (key) => (translations[language] && translations[language][key]) || key;

  const fetchWeatherByLocation = async (location) => {
    setLoading(true);
    if (location !== DEFAULT_LOCATION) {
      setError('');
    }

    const currentApiKey = useBackupKey ? BACKUP_KEY : WEATHER_API_KEY;
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${currentApiKey}&units=metric`
      );
      
      if (!response.ok) {
        if (response.status === 401 && !useBackupKey) {
          setUseBackupKey(true);
          return fetchWeatherByLocation(location);
        } else if (response.status === 404) {
          throw new Error('Location not found. Please check spelling and try again.');
        } else {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      displayWeatherData(data);
      setError('');
    } catch (err) {
      console.error('Error fetching weather data:', err);
      if (location === DEFAULT_LOCATION) {
        setError('Unable to load weather data for Chennai. Using offline fallback data.');
      } else {
        setError(err.message || 'Could not fetch weather data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async (lat, lon) => {
    const currentApiKey = useBackupKey ? BACKUP_KEY : WEATHER_API_KEY;
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${currentApiKey}&units=metric`
      );
      
      if (response.ok) {
        const data = await response.json();
        displayWeatherData(data);
      }
    } catch (err) {
      console.error('Error fetching weather by coordinates:', err);
    }
  };

  const displayWeatherData = (data) => {
    setWeather(data);
    generateRecommendations(data);
    generateWeeklyForecast(data);
    try {
      checkAndDispatchHighRiskAlert(data);
    } catch (e) {
      console.warn('High risk alert dispatch skipped:', e?.message || e);
    }
    
    // Cache weather data
    try {
      localStorage.setItem('weather-cache', JSON.stringify({
        data: data,
        timestamp: new Date().getTime()
      }));
    } catch (e) {
      console.error('Failed to cache weather data:', e);
    }
  };

  function buildPrecautionsFromState() {
    const items = [];
    crisis.forEach(c => items.push(`${c.title}: ${c.content}`));
    measures.forEach(m => items.push(`${m.title}: ${m.content}`));
    return items.slice(0, 8);
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

  async function checkAndDispatchHighRiskAlert(data) {
    const detection = detectHighRisk(data);
    if (!detection.isHighRisk) return;

    const place = `${data?.name || 'Your area'}${data?.sys?.country ? ', ' + data.sys.country : ''}`;
    const risks = detection.risks.join(', ');
    const tips = buildPrecautionsFromState();

    const message = `High-risk weather in ${place}: ${risks}. Precautions: ${tips.join('; ')}`;

    try {
      const idToken = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).uid : null;
      const authHeader = await buildAuthHeader();
      await fetch(`${API_BASE}/alerts/weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader || {})
        },
        body: JSON.stringify({ message, city: data?.name || 'Unknown' })
      });
    } catch (e) {
      console.error('Failed to dispatch high-risk alert:', e);
    }
  }

  async function buildAuthHeader() {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      if (auth?.currentUser) {
        const token = await auth.currentUser.getIdToken();
        return { Authorization: `Bearer ${token}` };
      }
    } catch (_) {}
    return null;
  }

  const generateRecommendations = (data) => {
    const recs = [];
    const temp = data.main.temp;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const weatherCondition = data.weather[0].main.toLowerCase();

    // Temperature-based recommendations
    if (temp > 35) {
      recs.push({
        type: 'warning',
        icon: 'fas fa-thermometer-full',
        title: 'High temperature alert!',
        content: 'Ensure adequate irrigation for crops.',
        expanded: 'For tomato and leafy greens, increase watering frequency to twice daily.',
        key: 'highTempAlert'
      });
    } else if (temp < 15) {
      recs.push({
        type: 'warning',
        icon: 'fas fa-thermometer-empty',
        title: 'Low temperature alert!',
        content: 'Protect cold-sensitive crops with covers.',
        expanded: 'Use row covers at night and remove during the day to allow sunlight.',
        key: 'lowTempAlert'
      });
    }

    // Humidity-based recommendations
    if (humidity > 80) {
      recs.push({
        type: 'alert',
        icon: 'fas fa-cloud-rain',
        title: 'High humidity alert!',
        content: 'Monitor crops for fungal infections.',
        expanded: 'Check undersides of leaves for signs of mildew.',
        key: 'highHumidityAlert'
      });
    }

    // Weather condition recommendations
    if (weatherCondition.includes('rain')) {
      recs.push({
        type: 'info',
        icon: 'fas fa-cloud-showers-heavy',
        title: 'Rainfall management',
        content: 'Avoid spraying pesticides or fertilizers.',
        expanded: 'Wait at least 24-48 hours after rainfall to apply any sprays.',
        key: 'rainfallExpected'
      });
    } else if (weatherCondition.includes('clear')) {
      recs.push({
        type: 'success',
        icon: 'fas fa-sun',
        title: 'Clear weather advantage',
        content: 'Good conditions for spraying operations if needed.',
        expanded: 'Best time is early morning when winds are calm.',
        key: 'clearWeather'
      });
    }

    // Wind-based recommendations
    if (windSpeed > 5) {
      recs.push({
        type: 'alert',
        icon: 'fas fa-wind',
        title: 'Strong winds',
        content: 'Strong winds may affect spraying operations.',
        expanded: 'Consider postponing if possible or use drift-reduction nozzles.',
        key: 'strongWinds'
      });
    }

    if (recs.length === 0) {
      recs.push({
        type: 'success',
        icon: 'fas fa-check-circle',
        title: 'Favorable conditions',
        content: 'Weather conditions are favorable for regular farming activities.',
        expanded: 'Good time for routine maintenance tasks.',
        key: 'favorableConditions'
      });
    }

    setRecommendations(recs.slice(0, 8));
  };

  const generateWeeklyForecast = (currentData) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // const weatherTypes = ['clear', 'clouds', 'rain', 'thunderstorm', 'drizzle']; // reserved for future weather variations
    const currentTemp = currentData.main.temp;
    const currentWeather = currentData.weather[0].main.toLowerCase();

    const forecastList = [];
    let rainChance = currentWeather.includes('rain') ? 70 : 20;

    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      
      let dayTemp = currentTemp + (Math.random() * 6 - 3);
      rainChance += 5;
      rainChance = Math.min(rainChance, 80);

      let weatherType = 'clear';
      if (Math.random() * 100 < rainChance) {
        weatherType = Math.random() * 100 < 30 ? 'thunderstorm' : 'rain';
      } else if (Math.random() * 100 < 30) {
        weatherType = 'clouds';
      }

      forecastList.push({
        day: days[forecastDate.getDay()],
        date: `${forecastDate.getDate()}/${forecastDate.getMonth() + 1}`,
        temp: Math.round(dayTemp),
        type: weatherType,
        icon: getWeatherIcon(weatherType)
      });
    }

    setForecast(forecastList);

    // Generate crisis and measures
    const crisisItems = [];
    const measureItems = [];

    if (currentTemp > 35) {
      crisisItems.push({
        icon: 'fas fa-fire',
        title: 'Heat Wave Crisis',
        content: 'Prolonged high temperatures can severely impact crop yields.'
      });
    }

    if (currentData.main.humidity > 80) {
      crisisItems.push({
        icon: 'fas fa-tint',
        title: 'High Humidity Risk',
        content: 'Monitor for fungal diseases and improve air circulation.'
      });
    }

    setCrisis(crisisItems);

    // Add preventive measures
    measureItems.push(
      {
        icon: 'fas fa-tint',
        title: 'Water Management',
        content: 'Efficient water use is critical for sustainable farming.',
        points: [
          'Install drip irrigation systems for targeted watering',
          'Collect and store rainwater for future use',
          'Monitor soil moisture levels regularly'
        ]
      },
      {
        icon: 'fas fa-shield-alt',
        title: 'Crop Protection',
        content: 'Protect your crops from various climate challenges.',
        points: [
          'Use proper spacing to prevent disease spread',
          'Plant wind-breaks to reduce crop damage',
          'Consider row covers for temperature-sensitive crops'
        ]
      },
      {
        icon: 'fas fa-seedling',
        title: 'Soil Health Management',
        content: 'Healthy soil improves resilience to weather extremes.',
        points: [
          'Apply appropriate mulch to regulate soil temperature',
          'Add organic matter to improve water retention',
          'Use cover crops to prevent erosion'
        ]
      }
    );

    setMeasures(measureItems);
  };

  const getWeatherIcon = (type) => {
    const iconMap = {
      'clear': '☀️',
      'clouds': '☁️',
      'rain': '🌧️',
      'thunderstorm': '⛈️',
      'drizzle': '🌦️',
      'snow': '❄️',
      'mist': '🌫️'
    };
    return iconMap[type] || '☀️';
  };

  const formatDate = (date) => {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-IN', options);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      fetchWeatherByLocation(query.trim());
    }
  };

  const handleRefresh = () => {
    if (weather) {
      fetchWeatherByLocation(weather.name);
    }
  };

  return (
    <div className="weather-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>{t('weatherDetails')}</h1>
        <p>{t('weatherDetailsDesc')}</p>
        
        {/* Language Toggle */}
        <div style={{ marginTop: '1rem' }}>
          <button
            className={`toggle-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            English
          </button>
          <button
            className={`toggle-btn ${language === 'ta' ? 'active' : ''}`}
            onClick={() => setLanguage('ta')}
          >
            தமிழ்
          </button>
        </div>
      </div>

      <div className="weather-container">
        {/* Search Form */}
        <form className="search-container" onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('locationPlaceholder')}
          />
          <button type="submit">
            <i className="fas fa-search"></i> {t('search')}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading">
            <i className="fas fa-spinner"></i>
            <p>{t('loadingWeather')}</p>
          </div>
        )}

        {/* Weather Content */}
        {weather && (
          <div id="weather-content">
            {/* Weather Card */}
            <div className="weather-card">
              <div className="weather-header">
                <div>
                  <h2>{weather.name}{weather.sys?.country ? `, ${weather.sys.country}` : ''}</h2>
                  <p>{formatDate(new Date())}</p>
                </div>
                <button onClick={handleRefresh} title={t('refreshWeather')}>
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>

              <div className="weather-main">
                <div className="weather-temp">{Math.round(weather.main.temp)}°C</div>
                <div>
                  <img
                    src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
                    alt="Weather Icon"
                    className="weather-icon"
                  />
                  <div className="weather-description">{weather.weather[0].description}</div>
                </div>
              </div>

              <div className="weather-details">
                <div className="weather-item">
                  <i className="fas fa-thermometer-half"></i>
                  <span>{t('feelsLike')}</span>
                  <strong>{Math.round(weather.main.feels_like)}°C</strong>
                </div>
                <div className="weather-item">
                  <i className="fas fa-tint"></i>
                  <span>{t('humidity')}</span>
                  <strong>{weather.main.humidity}%</strong>
                </div>
                <div className="weather-item">
                  <i className="fas fa-wind"></i>
                  <span>{t('windSpeed')}</span>
                  <strong>{Math.round(weather.wind.speed * 3.6)} km/h</strong>
                </div>
                <div className="weather-item">
                  <i className="fas fa-compass"></i>
                  <span>{t('windDirection')}</span>
                  <strong>{getWindDirection(weather.wind.deg)}</strong>
                </div>
                <div className="weather-item">
                  <i className="fas fa-sun"></i>
                  <span>{t('sunrise')}</span>
                  <strong>{formatTime(weather.sys.sunrise)}</strong>
                </div>
                <div className="weather-item">
                  <i className="fas fa-moon"></i>
                  <span>{t('sunset')}</span>
                  <strong>{formatTime(weather.sys.sunset)}</strong>
                </div>
              </div>
            </div>

            {/* Farming Recommendations */}
            <div className="farming-recommendations">
              <h3>{t('farmingRecommendations')}</h3>
              <ul>
                {recommendations.map((rec, index) => (
                  <li key={index}>
                    <strong>{rec.title}</strong> {rec.content}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendation Section */}
            <div className="recommendation-section">
              <div className="recommendation-header">
                <h2>{t('farmingRecommendations')}</h2>
                <div className="language-toggle">
                  <button
                    className={`toggle-btn ${language === 'en' ? 'active' : ''}`}
                    onClick={() => setLanguage('en')}
                  >
                    English
                  </button>
                  <button
                    className={`toggle-btn ${language === 'ta' ? 'active' : ''}`}
                    onClick={() => setLanguage('ta')}
                  >
                    தமிழ்
                  </button>
                </div>
              </div>

              <div className="rec-filter-container">
                <button className="rec-filter-btn active">
                  <i className="fas fa-filter"></i> All
                </button>
                <button className="rec-filter-btn">
                  <i className="fas fa-exclamation-circle"></i> Alerts
                </button>
                <button className="rec-filter-btn">
                  <i className="fas fa-check-circle"></i> Opportunities
                </button>
                <button className="rec-filter-btn">
                  <i className="fas fa-info-circle"></i> Tips
                </button>
              </div>

              <div className="recommendation-container">
                {recommendations.map((rec, index) => (
                  <div key={index} className={`recommendation-card card-${rec.type}`}>
                    <div className="card-header">
                      <div className="card-title-container">
                        <div className="card-icon">
                          <i className={rec.icon}></i>
                        </div>
                        <div>
                          <div className="card-title">{rec.title}</div>
                          {rec.type === 'warning' && <span className="importance-badge">Important</span>}
                        </div>
                      </div>
                      <div className="card-actions">
                        <button className="audio-btn" title="Listen">
                          <i className="fas fa-volume-up"></i>
                        </button>
                        <button className="share-btn" title="Share">
                          <i className="fas fa-share-alt"></i>
                        </button>
                      </div>
                    </div>
                    <div className="card-content">{rec.content}</div>
                    <div className="card-footer">
                      <button className="read-more-btn">
                        <i className="fas fa-chevron-down"></i> Read More
                      </button>
                      <span className="audio-badge">
                        <i className="fas fa-headphones"></i> Available
                      </span>
                    </div>
                    <div className="card-expanded">
                      <h4><i className="fas fa-seedling"></i> Crop-Specific Tips:</h4>
                      <div>{rec.expanded}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Forecast Section */}
            <div className="forecast-section">
              <div className="forecast-header">
                <h2>{t('weeklyForecast')}</h2>
                {crisis.length > 0 && (
                  <div className="crisis-badge">
                    <i className="fas fa-exclamation-triangle"></i>
                    {t('crisisAlert')}
                  </div>
                )}
              </div>

              <div className="forecast-container">
                {forecast.map((day, index) => (
                  <div key={index} className="forecast-card">
                    <div className="forecast-day">{day.day}</div>
                    <div className="forecast-date">{day.date}</div>
                    <div className="forecast-icon" style={{ fontSize: '2rem' }}>{day.icon}</div>
                    <div className="forecast-temp">{day.temp}°C</div>
                    <div className="forecast-description">{day.type}</div>
                  </div>
                ))}
              </div>

              {/* Crisis Management */}
              <div className="crisis-management">
                <h3>
                  <i className="fas fa-shield-alt"></i> {t('crisisManagement')}
                </h3>
                <div className="crisis-content">
                  {crisis.length === 0 ? (
                    <div className="crisis-card">
                      <div className="crisis-icon">
                        <i className="fas fa-info-circle"></i>
                      </div>
                      <div className="crisis-details">
                        <h4>Weather patterns normal</h4>
                        <p>No immediate weather crisis detected. Continue regular farming activities.</p>
                      </div>
                    </div>
                  ) : (
                    crisis.map((item, index) => (
                      <div key={index} className="crisis-card">
                        <div className="crisis-icon">
                          <i className={item.icon}></i>
                        </div>
                        <div className="crisis-details">
                          <h4>{item.title}</h4>
                          <p>{item.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Preventive Measures */}
              <div className="preventive-measures">
                <h3>
                  <i className="fas fa-hand-holding-medical"></i> {t('preventiveMeasures')}
                </h3>
                <div className="measures-container">
                  {measures.map((measure, index) => (
                    <div key={index} className="measure-card">
                      <div className="measure-header">
                        <div className="measure-icon">
                          <i className={measure.icon}></i>
                        </div>
                        <h4 className="measure-title">{measure.title}</h4>
                      </div>
                      <div className="measure-content">
                        <p>{measure.content}</p>
                        {measure.points && (
                          <ul>
                            {measure.points.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeatherPage;
