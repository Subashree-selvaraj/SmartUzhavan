
const API_BASE = (() => {
  // Highest priority: build-time env
  const envBase = process.env.REACT_APP_API_BASE;
  if (envBase) return envBase.replace(/\/$/, '');

  // Runtime overrides (no rebuild needed)
  if (typeof window !== 'undefined') {
    try {
      const urlParam = new URLSearchParams(window.location.search).get('api');
      if (urlParam) return urlParam.replace(/\/$/, '');
    } catch (_) {}

    if (window.__API_BASE__) return String(window.__API_BASE__).replace(/\/$/, '');
    try {
      const stored = window.localStorage.getItem('API_BASE');
      if (stored) return stored.replace(/\/$/, '');
    } catch (_) {}

    const origin = window.location.origin.replace(/\/$/, '');
    const isCRADev = origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000');
    return isCRADev ? '/api' : `${origin}/api`;
  }

  // Node/test fallback
  return 'http://localhost:5000/api';
})();

export { API_BASE };

export const diseaseApi = {
  // Post a new disease report
  postReport: async (report) => {
    try {
      const response = await fetch(`${API_BASE}/diseaseReports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error posting disease report:', error);
      throw error;
    }
  },

  // Fetch disease reports with filters
  fetchReports: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE}/diseaseReports?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching disease reports:', error);
      throw error;
    }
  },

  // Fetch nearby disease reports
  fetchNearby: async (lat, lng, radiusKm = 50) => {
    try {
      const response = await fetch(`${API_BASE}/diseaseReports/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching nearby reports:', error);
      throw error;
    }
  }
};
