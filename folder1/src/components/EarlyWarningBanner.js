import React, { useEffect, useState } from 'react';

const EarlyWarningBanner = ({ userDistrict }) => {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    if (!userDistrict) return;
    fetch(`/api/outbreak/outbreaks?district=${encodeURIComponent(userDistrict)}`)
      .then(res => res.json())
      .then(data => setAlerts(data.filter(r => r.count >= 3)))
      .catch(() => setAlerts([]));
  }, [userDistrict]);

  if (!alerts.length) return null;
  return (
    <div style={{
      background: '#fb8c00', color: 'white', padding: 12, borderRadius: 6, fontWeight: 600, marginBottom: 18,
    }}>
      ⚠️ Crop Outbreak Alerts: {alerts.map((alert, i) =>
        <span key={i} style={{ marginLeft: 12 }}>
          {alert._id.diseaseName} ({alert.count} reports)
        </span>
      )}
    </div>
  );
};
export default EarlyWarningBanner;
