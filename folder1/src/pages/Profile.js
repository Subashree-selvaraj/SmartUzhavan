
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
  const { currentUser, logout, enableNotifications } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const result = await enableNotifications();
      if (!result?.ok) {
        console.warn('Notifications not enabled:', result?.reason || 'unknown');
      }
    } catch (e) {
      console.error('Enable notifications error:', e);
    }
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const getUserDisplayName = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName;
    } else if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    } else if (currentUser?.phoneNumber) {
      return currentUser.phoneNumber;
    }
    return 'User';
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <img 
            src={currentUser?.photoURL || '/agri-icon.png'} 
            alt="Profile" 
            className="profile-avatar"
            onError={(e) => {
              e.target.src = '/agri-icon.png';
            }}
          />
          <h2>{getUserDisplayName()}</h2>
          <p className="profile-subtitle">Agriculture Expert User</p>
        </div>

        <div className="profile-info">
          <div className="info-section">
            <h3>Account Information</h3>
            <div className="info-item">
              <label>User ID:</label>
              <span>{currentUser.uid}</span>
            </div>
            {currentUser.email && (
              <div className="info-item">
                <label>Email:</label>
                <span>{currentUser.email}</span>
              </div>
            )}
            {currentUser.phoneNumber && (
              <div className="info-item">
                <label>Phone:</label>
                <span>{currentUser.phoneNumber}</span>
              </div>
            )}
            <div className="info-item">
              <label>Account Created:</label>
              <span>{currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'Not available'}</span>
            </div>
            <div className="info-item">
              <label>Last Sign In:</label>
              <span>{currentUser.metadata?.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 'Not available'}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn" onClick={handleEnableNotifications}>
            <i className="fas fa-bell"></i>
            Enable Weather Notifications
          </button>
          <button className="btn secondary" onClick={() => navigate('/')}>
            <i className="fas fa-home"></i>
            Back to Home
          </button>
          <button className="btn danger" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
