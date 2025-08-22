import React, { useState, useEffect, useRef } from 'react';

// Constants
const YT_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY || 'AIzaSyCdRbcIruKFZa0yHZxd00YYEUEeyCeIwlw';
const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

// Debug API key
console.log('YouTube API Key:', YT_API_KEY);

const DEFAULT_QUERY_TA = 'விவசாயம் விவசாயி Tamil farming';
const DEFAULT_QUERY_EN = 'farming agriculture';

const DEFAULT_TAGS_TA = [
  'விவசாயம்',
  'ஆர்கானிக் விவசாயம்',
  'விவசாய இயந்திரங்கள்',
  'பயிர்கள்',
  'விவசாய தொழில்நுட்பம்',
  'பாசனம்',
  'சந்தை விவசாயம்',
];

const DEFAULT_TAGS_EN = [
  'Farming',
  'Organic',
  'Machinery',
  'Crops',
  'Technology',
  'Irrigation',
  'Market',
];

const MAX_RESULTS = 12;

const translations = {
  en: {
    ytTitle: 'Agri & Farming YouTube Videos',
    searchPlaceholder: 'Search for agri/farming videos...',
    searchBtn: 'Search',
    tags: ['Farming', 'Organic', 'Machinery', 'Crops', 'Technology', 'Irrigation', 'Market'],
  },
  ta: {
    ytTitle: 'விவசாய YouTube வீடியோக்கள்',
    searchPlaceholder: 'விவசாய/பண்ணை வீடியோக்களை தேடுங்கள்...',
    searchBtn: 'தேடு',
    tags: ['விவசாயம்', 'ஆர்கானிக்', 'இயந்திரங்கள்', 'பயிர்கள்', 'தொழில்நுட்பம்', 'பாசனம்', 'சந்தை'],
  },
};

export default function YouTubeRefs() {
  const [currentLang, setCurrentLang] = useState('ta');
  const [searchQuery, setSearchQuery] = useState(DEFAULT_QUERY_TA);
  const [videos, setVideos] = useState([]);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const langDropdownRef = useRef(null);
  const langBtnRef = useRef(null);

  // Fetch videos from YouTube API
  const fetchVideos = async (query) => {
    if (!query || query.trim() === '') {
      setVideos([]);
      return;
    }
    const params = new URLSearchParams({
      key: YT_API_KEY,
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: MAX_RESULTS,
      relevanceLanguage: currentLang === 'ta' ? 'ta' : 'en',
      regionCode: 'IN',
    });

    try {
      const res = await fetch(`${YT_SEARCH_URL}?${params.toString()}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('YouTube API error:', errorText);
        setVideos([]);
        return;
      }
      const data = await res.json();
      if (!data.items) {
        console.error('No videos found in response data:', data);
        setVideos([]);
        return;
      }
      const vids = data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
      }));
      setVideos(vids);
    } catch (err) {
      console.error('Fetch error:', err);
      setVideos([]);
    }
  };

  // Perform search based on current input or default
  const doSearch = (query) => {
    fetchVideos(query);
  };

  // Handle Search button or Enter key
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      const defaultQuery = currentLang === 'ta' ? DEFAULT_QUERY_TA : DEFAULT_QUERY_EN;
      setSearchQuery(defaultQuery);
      doSearch(defaultQuery);
      setActiveTagIndex(-1);
    } else {
      doSearch(searchQuery);
      setActiveTagIndex(-1);
    }
  };

  // Handle tag button clicks
  const handleTagClick = (index) => {
    setActiveTagIndex(index);
    const tagQuery = currentLang === 'ta' ? DEFAULT_TAGS_TA[index] : DEFAULT_TAGS_EN[index];
    setSearchQuery(tagQuery);
    doSearch(tagQuery);
  };

  // Handle language change
  const switchLanguage = (lang) => {
    setCurrentLang(lang);
    setShowLangDropdown(false);
    if (lang === 'ta') {
      setSearchQuery(DEFAULT_QUERY_TA);
      setActiveTagIndex(0);
      doSearch(DEFAULT_QUERY_TA);
    } else {
      setSearchQuery(DEFAULT_QUERY_EN);
      setActiveTagIndex(0);
      doSearch(DEFAULT_QUERY_EN);
    }
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

  // Initial load: fetch default videos for Tamil language
  useEffect(() => {
    fetchVideos(DEFAULT_QUERY_TA);
  }, []);

  return (
    <>
      <style>{`
        body { font-family: 'Poppins', sans-serif; background: #f5f5f5; margin: 0; }
        .yt-header {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem 2rem;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .yt-title {
          font-size: 1.5rem;
          font-weight: 600;
          text-align: center;
        }
        .lang-switcher {
          position: relative;
          display: flex;
          align-items: center;
        }
        .lang-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 0.7rem 1.5rem;
          border-radius: 25px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          white-space: nowrap;
        }
        .lang-btn:hover {
          background: #45a049;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .lang-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          border-radius: 8px;
          z-index: 1000;
          min-width: 150px;
          margin-top: 0.5rem;
        }
        .lang-dropdown button {
          width: 100%;
          padding: 0.8rem 1rem;
          border: none;
          background: #4CAF50;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s ease;
          border-radius: 0;
        }
        .lang-dropdown button:first-child {
          border-radius: 8px 8px 0 0;
        }
        .lang-dropdown button:last-child {
          border-radius: 0 0 8px 8px;
        }
        .lang-dropdown button:hover {
          background: #f5f5f5;
          color:#4CAF50;
        }
        .yt-search-bar {
          display: flex;
          gap: 1.5rem;
          margin: 1rem auto 1rem auto;
          max-width: 800px;
          padding: 0 1rem;
          align-items: center;
          justify-content: center;
        }
        .search-input-group {
          display: flex;
          gap: 1rem;
          flex: 1;
          max-width: 500px;
          align-items: center;
        }
        .yt-search-bar input {
          flex: 1;
          padding: 0.7rem 1rem;
          border-radius: 4px;
          border: 1px solid #ccc;
          font-size: 1rem;
          outline: none;
        }
        .yt-search-bar button {
          padding: 0.7rem 1.5rem;
          border-radius: 4px;
          border: none;
          background: #4CAF50;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .yt-search-bar button:hover {
          background: #45a049;
        }
        .yt-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 1.5rem;
          padding: 0 1rem;
        }
        .yt-tag {
          background: #e0e0e0;
          border: none;
          border-radius: 16px;
          padding: 0.4rem 1rem;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .yt-tag.active, .yt-tag:hover {
          background: #4CAF50;
          color: #fff;
        }
        .yt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto 2rem auto;
          padding: 0 1rem;
        }
        .yt-card {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .yt-card iframe {
          width: 100%;
          height: 200px;
          border: none;
        }
        .yt-info {
          padding: 1rem;
        }
        .yt-title {
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .yt-channel {
          color: #666;
          font-size: 0.95rem;
        }
        @media (max-width: 600px) {
          .yt-header, .yt-search-bar {
            flex-direction: column;
            gap: 0.5rem;
            padding: 1rem;
          }
          .yt-search-bar {
            gap: 1rem;
          }
          .search-input-group {
            max-width: 100%;
            flex-direction: column;
            gap: 0.5rem;
          }
          .lang-switcher {
            margin-top: 0.5rem;
          }
          .yt-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="yt-header">
        <div className="yt-title" data-lang="ytTitle">
          {translations[currentLang].ytTitle}
        </div>
      </div>

      <div className="yt-search-bar">
        <div className="search-input-group">
          <input
            id="yt-search-input"
            type="text"
            placeholder={translations[currentLang].searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            aria-label="Search input"
          />
          <button id="yt-search-btn" onClick={handleSearch} type="button">
            {translations[currentLang].searchBtn}
          </button>
        </div>
        
        {/* Language Switcher - Now positioned next to search bar */}
        <div className="lang-switcher">
          <button
            className="lang-btn"
            id="lang-btn"
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            ref={langBtnRef}
            aria-haspopup="true"
            aria-expanded={showLangDropdown}
            type="button"
          >
            🌐 <span id="lang-label">{currentLang === 'en' ? 'English' : 'தமிழ்'}</span>
          </button>
          {showLangDropdown && (
            <div
              id="lang-dropdown"
              ref={langDropdownRef}
              className="lang-dropdown"
              role="menu"
            >
              <button
                className="lang-btn"
                data-lang="en"
                onClick={() => switchLanguage('en')}
                role="menuitem"
                type="button"
              >
                English
              </button>
              <button
                className="lang-btn"
                data-lang="ta"
                onClick={() => switchLanguage('ta')}
                role="menuitem"
                type="button"
              >
                தமிழ்
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="yt-tags" id="yt-tags" role="list">
        {(currentLang === 'ta' ? DEFAULT_TAGS_TA : DEFAULT_TAGS_EN).map((tag, index) => (
          <button
            key={tag}
            className={`yt-tag ${activeTagIndex === index ? 'active' : ''}`}
            data-tag={tag}
            onClick={() => handleTagClick(index)}
            role="listitem"
            type="button"
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="yt-grid" id="yt-grid" aria-live="polite">
        {videos.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>No videos found.</div>
        ) : (
          videos.map((video) => (
            <div className="yt-card" key={video.id}>
              <iframe
                title={video.title}
                src={`https://www.youtube.com/embed/${video.id}`}
                allowFullScreen
                loading="lazy"
                frameBorder="0"
              ></iframe>
              <div className="yt-info">
                <div className="yt-title">{video.title}</div>
                <div className="yt-channel">{video.channel}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
