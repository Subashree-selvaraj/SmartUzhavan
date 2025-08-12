
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import { diseaseApi } from '../api/diseaseApi';
import { API_BASE } from '../api/diseaseApi';
import './DiseaseMap.css';

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
    if (reports.length > 0) {
      const bounds = L.latLngBounds(
        reports.map(report => [
          report.location.coordinates[1], // lat
          report.location.coordinates[0]  // lng
        ])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [reports, map, selectedRegion]);

  return null;
};

const DiseaseMap = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const socketRef = useRef(null);

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
      setReports(prev => [newReport, ...prev]);
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
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Get reports from last 90 days for performance
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      
      const response = await diseaseApi.fetchReports({
        startDate: startDate.toISOString(),
        limit: 1000
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
      // Reuse the resolved API_BASE
      const base = API_BASE;
      const resp = await fetch(`${base}/diseaseReports/hotspots?days=14&cellSize=0.5&minCount=3`);
      const data = await resp.json();
      if (data.success) setHotspots(data.data);
    } catch (e) {
      console.warn('Failed to load hotspots');
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    // Apply crop filter
    if (filters.cropName) {
      filtered = filtered.filter(report => 
        report.cropName.toLowerCase().includes(filters.cropName.toLowerCase())
      );
    }

    // Apply disease filter
    if (filters.diseaseName) {
      filtered = filtered.filter(report => 
        report.diseaseName.toLowerCase().includes(filters.diseaseName.toLowerCase())
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
        new Date(report.dateReported) >= cutoffDate
      );
    }

    setFilteredReports(filtered);
  }, [reports, filters]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [reports, filters, applyFilters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="disease-map-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading disease map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="disease-map-page">
      <div className="map-header">
        <h1>🗺️ Real-time Disease Map</h1>
        <p>Track crop diseases across India in real-time</p>
      </div>

      <div className="map-container">
        {/* Filters Panel */}
        <div className="filters-panel">
          <h3>Filters</h3>
          
          <div className="filter-group">
            <label>Crop:</label>
            <select 
              value={filters.cropName} 
              onChange={(e) => handleFilterChange('cropName', e.target.value)}
            >
              <option value="">All Crops</option>
              {availableFilters.crops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Disease:</label>
            <select 
              value={filters.diseaseName} 
              onChange={(e) => handleFilterChange('diseaseName', e.target.value)}
            >
              <option value="">All Diseases</option>
              {availableFilters.diseases.map(disease => (
                <option key={disease} value={disease}>{disease}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Severity:</label>
            <select 
              value={filters.severity} 
              onChange={(e) => handleFilterChange('severity', e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Time Range:</label>
            <select 
              value={filters.timeRange} 
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>

          <div className="filter-group">
            <label>
              <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} />
              Show common hotspots (AI)
            </label>
          </div>

          <div className="stats">
            <p><strong>Total Reports:</strong> {filteredReports.length}</p>
            <div className="severity-stats">
              <div className="stat severe">
                Severe: {filteredReports.filter(r => r.severity === 'severe').length}
              </div>
              <div className="stat moderate">
                Moderate: {filteredReports.filter(r => r.severity === 'moderate').length}
              </div>
              <div className="stat mild">
                Mild: {filteredReports.filter(r => r.severity === 'mild').length}
              </div>
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
              >
                <Popup>
                  <div>
                    <strong>Common disease:</strong> {h.diseaseName}<br/>
                    Reports: {h.count} (last 14 days)
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            
            {/* Markers */}
            {filteredReports.map((report) => (
              <Marker
                key={report._id}
                position={[
                  report.location.coordinates[1], // lat
                  report.location.coordinates[0]  // lng
                ]}
                icon={createPinIcon(report.severity)}
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
                    <p><strong>Reported:</strong> {new Date(report.dateReported).toLocaleDateString()}</p>
                    <p><strong>By:</strong> {report.farmerName || report.reportedBy || 'Anonymous'}</p>
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
            ))}

            <MapController reports={filteredReports} />
          </MapContainer>
        </div>

        {/* Recent Reports Sidebar */}
        <div className="recent-reports">
          <h3>Recent Reports</h3>
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
        </div>
      </div>
    </div>
  );
};

export default DiseaseMap;
