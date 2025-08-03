import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';
import './NavbarAnimation.css';

const Navbar = () => {
  const { lang, setLang } = useLanguage();
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'ta' : 'en');
  };

  const handleAccountClick = () => {
    if (currentUser) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

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

  const getUserAvatar = () => {
    return currentUser?.photoURL || '/agri-icon.png';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('.navbar-menu') && !event.target.closest('.mobile-menu-icon')) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <Link to="/">
            <img src="/logo.jpg" alt="SmartUzhavan Logo" />
          </Link>
        </div>

        <div className="nav-right">
          <ul className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
            <li>
              <Link to="/" className="menu-item" onClick={() => setIsMenuOpen(false)}>
                {lang === 'en' ? 'Home' : 'முகப்பு'}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="menu-item" onClick={() => setIsMenuOpen(false)}>
                {lang === 'en' ? 'Contact' : 'தொடர்பு'}
              </Link>
            </li>
            <li>
              <Link onClick={toggleLanguage} to="#" className="menu-item">
                {lang === 'en' ? 'தமிழ்' : 'English'}
              </Link>
            </li>
          </ul>
        </div>

        <div className="account-section">
          <div
            className="account-icon"
            onClick={handleAccountClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleAccountClick();
              }
            }}
          >
            {currentUser ? (
              <div className="user-profile-link">
                <img
                  src={getUserAvatar()}
                  alt="Profile"
                  className="user-avatar"
                  onError={(e) => {
                    e.target.src = '/agri-icon.png';
                  }}
                />
                <span className="user-name">{getUserDisplayName()}</span>
                <i className="fas fa-chevron-down"></i>
              </div>
            ) : (
              <div className="login-link">
                <i className="fas fa-user-circle"></i>
                <span className="login-text">{lang === 'en' ? 'Login' : 'உள்நுழைய'}</span>
              </div>
            )}
          </div>

          {/* Profile click now directly navigates to profile page */}
        </div>

        <div
          className="mobile-menu-icon"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsMenuOpen(!isMenuOpen);
            }
          }}
        >
          <i className={isMenuOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
