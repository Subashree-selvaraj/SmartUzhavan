import React from 'react';
import './OfflinePage.css';

const OfflinePage = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="offline-page">
      <div className="offline-content">
        <div className="offline-icon">
          <i className="fas fa-wifi-slash"></i>
        </div>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Don't worry, you can still access some features of AgriConnect.</p>
        
        <div className="offline-features">
          <h3>Available Offline:</h3>
          <ul>
            <li><i className="fas fa-leaf"></i> Disease Detection (cached models)</li>
            <li><i className="fas fa-book"></i> Farming Guides</li>
            <li><i className="fas fa-calculator"></i> Crop Calculator</li>
            <li><i className="fas fa-history"></i> Previously viewed content</li>
          </ul>
        </div>

        <div className="offline-actions">
          <button className="retry-btn" onClick={handleRetry}>
            <i className="fas fa-redo"></i>
            Try Again
          </button>
          <button className="home-btn" onClick={() => window.location.href = '/'}>
            <i className="fas fa-home"></i>
            Go Home
          </button>
        </div>

        <div className="offline-tip">
          <i className="fas fa-lightbulb"></i>
          <p>Tip: Install AgriConnect as an app for better offline experience!</p>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage; 