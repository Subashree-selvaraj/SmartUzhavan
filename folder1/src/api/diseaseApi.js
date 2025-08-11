
const API_BASE = process.env.REACT_APP_API_BASE || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

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
