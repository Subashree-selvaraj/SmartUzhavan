
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import { diseaseApi } from '../api/diseaseApi';
import { API_BASE } from '../api/diseaseApi';
import './DiseaseMap.css';

// Language translations
const translations = {
  en: {
    pageTitle: '🗺️ Real-time Disease Map',
    pageSubtitle: 'Track crop diseases across India in real-time',
    filtersTitle: 'Filters',
    cropLabel: 'Crop:',
    cropPlaceholder: 'All Crops',
    diseaseLabel: 'Disease:',
    diseasePlaceholder: 'All Diseases',
    severityLabel: 'Severity:',
    severityPlaceholder: 'All Severities',
    timeRangeLabel: 'Time Range:',
    timeRange7Days: 'Last 7 days',
    timeRange30Days: 'Last 30 days',
    timeRange90Days: 'Last 3 months',
    hotspotsLabel: 'Show common hotspots (AI)',
    totalReports: 'Total Reports:',
    severityStats: {
      severe: 'Severe',
      moderate: 'Moderate',
      mild: 'Mild'
    },
    severityInfo: 'Severity is based on disease type and impact: Severe (high-damage diseases), Moderate (medium-impact diseases), Mild (low-impact or unknown diseases)',
    recentReportsTitle: 'Recent Reports',
    loadMoreBtn: 'Load More Reports',
    loadingMore: 'Loading...',
    loadingMessage: 'Loading disease map...',
    loadingTip1: '💡 Tip: The map is loading recent disease reports from the last 30 days',
    loadingTip2: '🌱 Tip: Use filters to narrow down results once loaded',
    markersLimitMessage: 'Showing first 200 markers. Use filters to narrow results.',
    languageButton: '🌐 Language',
    languageEnglish: 'English',
    languageTamil: 'தமிழ்'
  },
  ta: {
    pageTitle: '🗺️ நேரலை நோய் வரைபடம்',
    pageSubtitle: 'இந்தியா முழுவதும் பயிர் நோய்களை நேரலை கண்காணிக்கவும்',
    filtersTitle: 'வடிப்பான்கள்',
    cropLabel: 'பயிர்:',
    cropPlaceholder: 'அனைத்து பயிர்களும்',
    diseaseLabel: 'நோய்:',
    diseasePlaceholder: 'அனைத்து நோய்களும்',
    severityLabel: 'கடுமை:',
    severityPlaceholder: 'அனைத்து கடுமைகளும்',
    timeRangeLabel: 'நேர வரம்பு:',
    timeRange7Days: 'கடந்த 7 நாட்கள்',
    timeRange30Days: 'கடந்த 30 நாட்கள்',
    timeRange90Days: 'கடந்த 3 மாதங்கள்',
    hotspotsLabel: 'பொதுவான சூடான இடங்களை காட்டு (AI)',
    totalReports: 'மொத்த அறிக்கைகள்:',
    severityStats: {
      severe: 'கடுமையானது',
      moderate: 'மிதமானது',
      mild: 'மென்மையானது'
    },
    severityInfo: 'கடுமை நோய் வகை மற்றும் தாக்கத்தின் அடிப்படையில்: கடுமையானது (அதிக சேதம் விளைவிக்கும் நோய்கள்), மிதமானது (நடுத்தர தாக்க நோய்கள்), மென்மையானது (குறைந்த தாக்க அல்லது அறியப்படாத நோய்கள்)',
    recentReportsTitle: 'சமீபத்திய அறிக்கைகள்',
    loadMoreBtn: 'மேலும் அறிக்கைகளை ஏற்று',
    loadingMore: 'ஏற்றுகிறது...',
    loadingMessage: 'நோய் வரைபடம் ஏற்றுகிறது...',
    loadingTip1: '💡 குறிப்பு: வரைபடம் கடந்த 30 நாட்களின் சமீபத்திய நோய் அறிக்கைகளை ஏற்றுகிறது',
    loadingTip2: '🌱 குறிப்பு: ஏற்றப்பட்டவுடன் முடிவுகளை குறைக்க வடிப்பான்களைப் பயன்படுத்தவும்',
    markersLimitMessage: 'முதல் 200 குறிப்பான்களை காட்டுகிறது. முடிவுகளை குறைக்க வடிப்பான்களைப் பயன்படுத்தவும்.',
    languageButton: '🌐 மொழி',
    languageEnglish: 'English',
    languageTamil: 'தமிழ்'
  }
};

// Custom marker icons for different severity levels
const createPinIcon = (severity) => {
  const color = severity === 'severe' ? '#e53935' : severity === 'moderate' ? '#fb8c00' : '#43a047';
  const pinSvg = `
    <svg width="28" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7Z"/>
      <circle cx="12" cy="9" r="3.5" fill="white"/>
    </svg>`;
  return L.divIcon({ className: 'custom-marker', html: pinSvg, iconSize: [28, 40], iconAnchor: [14, 38], popupAnchor: [0, -32] });
};

// Component to handle map bounds fitting
const MapController = ({ reports, selectedRegion }) => {
  const map = useMap();

  useEffect(() => {
    const positions = (reports || [])
      .map(r => {
        const coords = r?.location?.coordinates || [];
        const lat = Number(coords[1]);
        const lng = Number(coords[0]);
        return { lat, lng };
      })
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0));

    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [reports, map, selectedRegion]);

  return null;
};

const DiseaseMap = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hotspotsLoading, setHotspotsLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => {
    // Get language from localStorage or default to Tamil
    return localStorage.getItem('diseasemap_lang') || 'ta';
  });
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [filters, setFilters] = useState({
    cropName: '',
    diseaseName: '',
    severity: '',
    timeRange: '30' // days
  });
  const [availableFilters, setAvailableFilters] = useState({
    crops: [],
    diseases: []
  });
  const [hotspots, setHotspots] = useState([]);
  const [showHotspots, setShowHotspots] = useState(true);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const socketRef = useRef(null);
  const langDropdownRef = useRef(null);
  const langBtnRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    // Derive socket base from env, URL param, window override, or API_BASE
    let SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
    if (!SOCKET_URL && typeof window !== 'undefined') {
      try {
        const urlParam = new URLSearchParams(window.location.search).get('socket');
        if (urlParam) SOCKET_URL = urlParam;
      } catch (_) {}
      if (!SOCKET_URL && window.__SOCKET_URL__) SOCKET_URL = String(window.__SOCKET_URL__);
      if (!SOCKET_URL) {
        try {
          const stored = window.localStorage.getItem('SOCKET_URL');
          if (stored) SOCKET_URL = stored;
        } catch (_) {}
      }
    }
    if (!SOCKET_URL) {
      // If API_BASE looks like https://host/api, strip trailing /api for socket
      try {
        const api = API_BASE.replace(/\/$/, '');
        SOCKET_URL = api.endsWith('/api') ? api.slice(0, -4) : api;
      } catch (_) {
        SOCKET_URL = (typeof window !== 'undefined' ? window.location.origin : '');
      }
    }
 
    const newSocket = io(SOCKET_URL);
 
    newSocket.on('connect', () => {
      console.log('Connected to disease map socket');
    });

    newSocket.on('newReport', (newReport) => {
      console.log('Received new disease report:', newReport);
      try {
        const coords = newReport?.location?.coordinates || [];
        const lng = parseFloat(coords[0]);
        const lat = parseFloat(coords[1]);
        const normalized = {
          ...newReport,
          severity: newReport?.severity || 'mild',
          dateReported: newReport?.dateReported || new Date().toISOString(),
          location: {
            type: 'Point',
            coordinates: [Number.isFinite(lng) ? lng : 0, Number.isFinite(lat) ? lat : 0]
          }
        };
        setReports(prev => [normalized, ...prev]);
      } catch (_) {
        setReports(prev => [newReport, ...prev]);
      }
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Load initial data
  useEffect(() => {
    loadReports();
    loadHotspots();
    // Reduce polling frequency from 30s to 2 minutes for better performance
    const id = setInterval(() => {
      loadReports();
    }, 120000); // 2 minutes instead of 30 seconds
    return () => clearInterval(id);
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Reduce initial load to last 30 days instead of 90 for faster loading
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const response = await diseaseApi.fetchReports({
        startDate: startDate.toISOString(),
        limit: 500, // Reduce from 1000 to 500 for faster initial load
        lang: currentLang // Pass current language to API
      });

      setReports(response.data || []);
      setAvailableFilters({
        crops: response.filters?.crops || [],
        diseases: response.filters?.diseases || []
      });
    } catch (error) {
      console.error('Error loading disease reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHotspots = async () => {
    try {
      // Add loading state for hotspots
      const base = API_BASE;
      const resp = await fetch(`${base}/diseaseReports/hotspots?days=7&cellSize=1.0&minCount=2&lang=${currentLang}`); // Pass language
      const data = await resp.json();
      if (data.success) setHotspots(data.data);
    } catch (e) {
      console.warn('Failed to load hotspots');
    } finally {
      setHotspotsLoading(false);
    }
  };

  const loadMoreReports = async () => {
    if (loadingMore || !hasMoreData) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const response = await diseaseApi.fetchReports({
        startDate: startDate.toISOString(),
        limit: 500,
        page: nextPage,
        lang: currentLang // Pass current language to API
      });

      if (response.data && response.data.length > 0) {
        setReports(prev => [...prev, ...response.data]);
        setCurrentPage(nextPage);
        setHasMoreData(response.data.length === 500);
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error('Error loading more reports:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    // Apply crop filter
    if (filters.cropName) {
      filtered = filtered.filter(report => 
        report.cropName && report.cropName.toLowerCase().includes(filters.cropName.toLowerCase())
      );
    }

    // Apply disease filter
    if (filters.diseaseName) {
      filtered = filtered.filter(report => 
        report.diseaseName && report.diseaseName.toLowerCase().includes(filters.diseaseName.toLowerCase())
      );
    }

    // Apply severity filter
    if (filters.severity) {
      filtered = filtered.filter(report => report.severity === filters.severity);
    }

    // Apply time range filter
    if (filters.timeRange) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(filters.timeRange));
      filtered = filtered.filter(report => 
        report.dateReported && new Date(report.dateReported) >= cutoffDate
      );
    }

    setFilteredReports(filtered);
  }, [reports, filters]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [reports, filters, applyFilters]);

  // Reload data when language changes
  useEffect(() => {
    if (reports.length > 0) {
      // Show loading notification for language change
      setLoading(true);
      loadReports();
      loadHotspots();
    }
  }, [currentLang]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Close dropdown on click outside
  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(e.target) &&
        langBtnRef.current &&
        !langBtnRef.current.contains(e.target)
      ) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Handle language change
  const switchLanguage = (lang) => {
    if (lang === currentLang) return; // Don't switch if same language
    
    setCurrentLang(lang);
    setShowLangDropdown(false);
    // Save language choice to localStorage
    localStorage.setItem('diseasemap_lang', lang);
    
    // Show notification
    const notification = document.createElement('div');
    notification.className = 'lang-switch-notification';
    notification.textContent = `🔄 Switching to ${lang === 'ta' ? 'Tamil' : 'English'}...`;
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };

  if (loading) {
    return (
      <div className="disease-map-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{translations[currentLang].loadingMessage}</p>
          <div className="loading-tips">
            <p>{translations[currentLang].loadingTip1}</p>
            <p>{translations[currentLang].loadingTip2}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="disease-map-page">
      <div className="map-header">
        <div className="header-content">
          <div className="header-text">
            <h1>{translations[currentLang].pageTitle}</h1>
            <p>{translations[currentLang].pageSubtitle}</p>
          </div>
          
          {/* Language Switcher */}
          <div className="lang-switcher">
            <button
              className="lang-btn"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              ref={langBtnRef}
              aria-haspopup="true"
              aria-expanded={showLangDropdown}
              type="button"
            >
              {translations[currentLang].languageButton} 
              <span className="current-lang-indicator">
                {currentLang === 'ta' ? '🇮🇳' : '🇬🇧'}
              </span>
            </button>
            {showLangDropdown && (
              <div
                ref={langDropdownRef}
                className="lang-dropdown"
                role="menu"
              >
                <button
                  className="lang-dropdown-btn"
                  onClick={() => switchLanguage('en')}
                  role="menuitem"
                  type="button"
                >
                  🇬🇧 {translations[currentLang].languageEnglish}
                </button>
                <button
                  className="lang-dropdown-btn"
                  onClick={() => switchLanguage('ta')}
                  role="menuitem"
                  type="button"
                >
                  🇮🇳 {translations[currentLang].languageTamil}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="map-container">
        {/* Filters Panel */}
        <div className="filters-panel">
          <h3>{translations[currentLang].filtersTitle}</h3>
          
          <div className="filter-group">
            <label>{translations[currentLang].cropLabel}</label>
            <select 
              value={filters.cropName} 
              onChange={(e) => handleFilterChange('cropName', e.target.value)}
            >
              <option value="">{translations[currentLang].cropPlaceholder}</option>
              {availableFilters.crops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{translations[currentLang].diseaseLabel}</label>
            <select 
              value={filters.diseaseName} 
              onChange={(e) => handleFilterChange('diseaseName', e.target.value)}
            >
              <option value="">{translations[currentLang].diseasePlaceholder}</option>
              {availableFilters.diseases.map(disease => (
                <option key={disease} value={disease}>{disease}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{translations[currentLang].severityLabel}</label>
            <select 
              value={filters.severity} 
              onChange={(e) => handleFilterChange('severity', e.target.value)}
            >
              <option value="">{translations[currentLang].severityPlaceholder}</option>
              <option value="mild">{translations[currentLang].severityStats.mild}</option>
              <option value="moderate">{translations[currentLang].severityStats.moderate}</option>
              <option value="severe">{translations[currentLang].severityStats.severe}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{translations[currentLang].timeRangeLabel}</label>
            <select 
              value={filters.timeRange} 
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            >
              <option value="7">{translations[currentLang].timeRange7Days}</option>
              <option value="30">{translations[currentLang].timeRange30Days}</option>
              <option value="90">{translations[currentLang].timeRange90Days}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>
              <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} />
              {translations[currentLang].hotspotsLabel} {hotspotsLoading && <span className="loading-dots">...</span>}
            </label>
          </div>

          <div className="stats">
            <p><strong>{translations[currentLang].totalReports}</strong> {filteredReports.length}</p>
            <div className="severity-stats">
              <div className="stat severe">
                {translations[currentLang].severityStats.severe}: {filteredReports.filter(r => r.severity === 'severe').length}
              </div>
              <div className="stat moderate">
                {translations[currentLang].severityStats.moderate}: {filteredReports.filter(r => r.severity === 'moderate').length}
              </div>
              <div className="stat mild">
                {translations[currentLang].severityStats.mild}: {filteredReports.filter(r => r.severity === 'mild').length}
              </div>
            </div>
            {/* Debug information */}
            <div className="debug-info" style={{ fontSize: '12px', color: '#666', marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
              <p><strong>Debug Info:</strong></p>
              <p>Unique severities found: {[...new Set(filteredReports.map(r => r.severity))].join(', ') || 'None'}</p>
              <p>Unique diseases: {[...new Set(filteredReports.map(r => r.diseaseName))].join(', ') || 'None'}</p>
              <p>Date range: {filteredReports.length > 0 ? 
                `${new Date(Math.min(...filteredReports.map(r => new Date(r.dateReported)))).toLocaleDateString()} to ${new Date(Math.max(...filteredReports.map(r => new Date(r.dateReported)))).toLocaleDateString()}` : 
                'No reports'}</p>
              <p><em>{translations[currentLang].severityInfo}</em></p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="map-wrapper">
          <MapContainer
            center={[20.5937, 78.9629]} // Center of India
            zoom={5}
            style={{ height: '600px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Hotspots overlay */}
            {showHotspots && hotspots.map((h, idx) => (
              <CircleMarker
                key={`hs-${idx}`}
                center={[h.lat, h.lng]}
                radius={8 + Math.min(h.count, 10)}
                pathOptions={{
                  color: '#8e24aa',
                  fillColor: '#ba68c8',
                  fillOpacity: 0.25,
                  weight: 2
                }}
                interactive={false}
              />
            ))}
            
            {/* Markers */}
            {filteredReports.slice(0, 200).map((report, idx) => {
              const coords = report?.location?.coordinates || [];
              const lng = Number(coords[0]);
              const lat = Number(coords[1]);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              const reportedDate = report?.dateReported ? new Date(report.dateReported) : null;

              return (
                <Marker
                  key={`${String(report._id || 'new')}-${lat}-${lng}-${idx}`}
                  position={[lat, lng]}
                  icon={createPinIcon(report.severity)}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div className="marker-popup">
                      <h4>{report.cropName}</h4>
                      <p><strong>Disease:</strong> {report.diseaseName}</p>
                      <p><strong>Severity:</strong> 
                        <span className={`severity-badge ${report.severity}`}>
                          {report.severity}
                        </span>
                      </p>
                      <p><strong>Reported:</strong> {reportedDate ? reportedDate.toLocaleDateString() : 'N/A'}</p>
                      <p><strong>By:</strong> {report.farmerName || report.reportedBy || 'Anonymous'}</p>
                      {report.reporterEmail && (
                        <p><strong>Contact (Email):</strong> <a href={`mailto:${report.reporterEmail}`}>{report.reporterEmail}</a></p>
                      )}
                      {report.reporterPhone && (
                        <p><strong>Contact (Phone):</strong> <a href={`tel:${report.reporterPhone}`}>{report.reporterPhone}</a></p>
                      )}
                      {report.imageUrl && (
                        <img 
                          src={report.imageUrl} 
                          alt="Disease" 
                          style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '5px' }}
                        />
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Show message if more markers are available */}
            {filteredReports.length > 200 && (
              <div className="map-info-overlay">
                <p>{translations[currentLang].markersLimitMessage}</p>
              </div>
            )}
            
            <MapController reports={filteredReports} />
          </MapContainer>
        </div>

        {/* Recent Reports Sidebar */}
        <div className="recent-reports">
          <h3>{translations[currentLang].recentReportsTitle}</h3>
          <div className="reports-list">
            {filteredReports.slice(0, 10).map((report) => (
              <div key={report._id} className="report-item">
                <div className={`severity-indicator ${report.severity}`}></div>
                <div className="report-details">
                  <h4>{report.cropName}</h4>
                  <p>{report.diseaseName}</p>
                  <small>{new Date(report.dateReported).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
          
          {/* Load More Button */}
          {hasMoreData && (
            <div className="load-more-container">
              <button 
                className="load-more-btn"
                onClick={loadMoreReports}
                disabled={loadingMore}
              >
                {loadingMore ? translations[currentLang].loadingMore : translations[currentLang].loadMoreBtn}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiseaseMap;
