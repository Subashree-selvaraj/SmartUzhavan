import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const OutbreakHeatmap = () => {
  const [district, setDistrict] = useState('');
  const [outbreaks, setOutbreaks] = useState([]);
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!district) return;
    fetch(`/api/outbreak/outbreaks?district=${encodeURIComponent(district)}`)
      .then(res => res.json())
      .then(data => setOutbreaks(data))
      .catch(() => setOutbreaks([]));
  }, [district]);

  useEffect(() => {
    if (!district || outbreaks.length === 0) return;
    if (map) map.remove();

    const m = L.map('outbreak-map', {
      center: [11.1271, 78.6569], zoom: 7
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m);

    outbreaks.forEach((report) => {
      // Fake random location in district – for demo only
      const lat = 10 + Math.random()*3;
      const lng = 78 + Math.random()*4;
      let color = '#4caf50';
      if (report.count > 5) color = '#e53935';
      else if (report.count > 2) color = '#fb8c00';

      const marker = L.circleMarker([lat, lng], {
        radius: 8 + report.count,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7,
      }).addTo(m);
      marker.bindPopup(`<b>${report._id.diseaseName}</b><br/>Reports: ${report.count}`);
    });
    setMap(m);
  }, [outbreaks, district]);

  return (
    <div>
      <h3>Crop Outbreaks in Your District</h3>
      <input
        type="text"
        placeholder="Enter your district (e.g., Thanjavur)"
        value={district}
        onChange={e => setDistrict(e.target.value)}
        style={{ padding: 8, marginBottom: 12 }}
      />
      <div id="outbreak-map" style={{ height: 400, maxWidth: 720 }}></div>
      {district && outbreaks.length === 0 && (<p>No outbreak reports found for {district} (last 7 days).</p>)}
    </div>
  );
};
export default OutbreakHeatmap;
