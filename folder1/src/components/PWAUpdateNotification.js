import React from 'react';
import { usePWA } from '../hooks/usePWA';
import './PWAUpdateNotification.css';

const PWAUpdateNotification = () => {
  const { updateAvailable, updateApp } = usePWA();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="pwa-update-notification">
      <div className="pwa-update-content">
        <div className="pwa-update-icon">
          <i className="fas fa-sync-alt"></i>
        </div>
        <div className="pwa-update-text">
          <h3>Update Available</h3>
          <p>A new version of AgriConnect is available with improved features and bug fixes.</p>
        </div>
        <div className="pwa-update-actions">
          <button 
            className="pwa-update-btn"
            onClick={updateApp}
          >
            <i className="fas fa-download"></i>
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateNotification; 