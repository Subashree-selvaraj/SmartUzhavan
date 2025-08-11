import React, { useState, useEffect, useRef } from 'react';
 // Assuming you have a CSS file for additional styles
// Constants
const API_URL = 'http://localhost:5000/api/schemes';

const LANGS = {
  en: {
    title: 'Farmer Schemes Portal',
    subtitle: 'Discover the latest government schemes for Tamil Nadu farmers',
    langLabel: 'English',
    apply: 'Apply Now',
    youtube: '🎥 Watch on YouTube',
    noSchemes: 'No schemes found.',
    category: 'Agriculture, Rural & Environment'
  },
  ta: {
    title: 'விவசாயி திட்டங்கள்',
    subtitle: 'தமிழ்நாடு விவசாயிகளுக்கான சமீபத்திய அரசு திட்டங்களை கண்டறியுங்கள்',
    langLabel: 'தமிழ்',
    apply: 'இப்போது விண்ணப்பிக்கவும்',
    youtube: '🎥 YouTube-இல் பார்க்க',
    noSchemes: 'திட்டங்கள் இல்லை.',
    category: 'விவசாயம், ஊரகம் மற்றும் சுற்றுச்சூழல்'
  }
};

// Styles as object
const styles = {
  body: {
    fontFamily: "'Poppins', 'Segoe UI', Arial, sans-serif",
    background: "linear-gradient(135deg, #f7faf7 0%, #e8f5e9 100%) fixed",
    minHeight: "100vh",
    margin: 0,
    padding: 0,
     marginTop: "82px",
    backgroundImage: "url('https://www.transparenttextures.com/patterns/symphony.png')",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem 3vw",
    background: "linear-gradient(90deg, #388e3c 60%, #43a047 100%)",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 4px 24px rgba(56,142,60,0.13)",
    borderBottomLeftRadius: "18px",
    borderBottomRightRadius: "18px",
  },
  portalTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    lineHeight: 1.1,
  },
  headerSub: {
    fontSize: "1rem",
    fontWeight: 400,
    color: "#e0f2f1",
    marginTop: "0.2rem",
    marginLeft: "0.2rem",
    letterSpacing: "0.1px",
  },
  schemesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1.2rem",
    padding: "2rem 2vw 2.5rem 2vw",
    maxWidth: "1100px",
    margin: "0 auto"
  },
  schemeCard: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(56,142,60,0.10), 0 1.5px 6px rgba(56,142,60,0.06)",
    padding: "1.2rem 1rem 1rem 1.1rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    position: "relative",
    borderLeft: "5px solid #43a047",
    borderTop: "1px solid #e0e0e0",
    borderRight: "1px solid #e0e0e0",
    borderBottom: "1px solid #e0e0e0",
    overflow: "visible",
    transition: "box-shadow 0.18s, transform 0.18s, border 0.18s"
  },
  schemeTitle: {
    fontSize: "1.08rem",
    fontWeight: 600,
    color: "#222",
    marginBottom: "0.3rem",
    letterSpacing: "0.08px",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  schemeDesc: {
    color: "#444",
    fontSize: "0.98rem",
    marginBottom: "0.7rem",
    flex: 1,
    lineHeight: 1.5,
    fontWeight: 400
  },
  schemeCategory: {
    fontSize: "0.93rem",
    color: "#388e3c",
    background: "#f8faf8",
    border: "1.2px solid #43a047",
    display: "inline-block",
    padding: "0.13em 0.7em",
    borderRadius: "999px",
    fontWeight: 500,
    letterSpacing: "0.09px",
    marginBottom: "0.7rem",
    boxShadow: "none",
  },
  schemeActions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.3rem"
  },
  applyBtn: {
    flex: 1,
    padding: "0.28rem 0.5rem",
    border: "1px solid #43a047",
    borderRadius: "6px",
    background: "#e8f5e9",
    color: "#256029",
    fontSize: "0.97rem",
    cursor: "pointer",
    fontWeight: 500,
    boxShadow: "0 1px 4px rgba(56,142,60,0.07)",
    transition: "background 0.18s, color 0.18s, box-shadow 0.18s"
  },
  youtubeBtn: {
    flex: 1,
    padding: "0.28rem 0.5rem",
    border: "1px solid #e53935",
    borderRadius: "6px",
    background: "#fff",
    color: "#e53935",
    fontSize: "0.97rem",
    cursor: "pointer",
    fontWeight: 500,
    boxShadow: "0 1px 4px rgba(56,142,60,0.07)",
    transition: "background 0.18s, color 0.18s, box-shadow 0.18s"
  },
  spinner: {
    display: "block",
    margin: "2.2rem auto 1.2rem auto",
    border: "6px solid #e0e0e0",
    borderTop: "6px solid #388e3c",
    borderRadius: "50%",
    width: "38px",
    height: "38px",
    animation: "spin 1s linear infinite"
  },
  noSchemes: {
    textAlign: "center",
    color: "#888",
    fontSize: "1.05rem",
    marginTop: "2.2rem",
    fontWeight: 600,
    letterSpacing: "0.09px"
  },
  // Footer styles, Lang dropdown, Mobile responsiveness, etc. omitted for brevity.
};

function Spinner() {
  return (
    <div style={styles.spinner}
      className="spinner"
    />
  );
}

function SchemesPortal() {
  const [lang, setLang] = useState(() => localStorage.getItem('schemes_lang') || 'en');
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('schemes_lang', lang);
    setLoading(true);
    setError(false);
    fetch(`${API_URL}?lang=${lang}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setSchemes(data || []);
        setLoading(false);
      })
      .catch(() => {
        setSchemes([]);
        setError(true);
        setLoading(false);
      });
  }, [lang]);

  // For dropdown close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!dropdownRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // For spinner animation (keyframes)
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes spin { 
        0% { transform: rotate(0deg);} 
        100% {transform: rotate(360deg);}
      }
      @media (max-width: 900px) {
        .schemes-grid { grid-template-columns: 1fr !important; padding: 1rem 2vw !important }
        .scheme-card { padding: 0.9rem 0.5rem 0.9rem 0.5rem !important }
        header { flex-direction:column; align-items:flex-start; gap:0.7rem; padding: 1rem 2vw 1rem 2vw !important; border-radius:0 0 12px 12px; }
        #portal-title { font-size: 1rem !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); }
  }, []);

  // SCHEME CARD
  function renderSchemeCard(s) {
    let ytQuery = s.name;
    if (lang === 'ta') {
      ytQuery += ' விவசாயி திட்டங்கள்';
    } else {
      ytQuery += ' farming scheme';
    }
    return (
      <div className="scheme-card" style={styles.schemeCard} key={s.id || s.name}>
        <div className="scheme-title" style={styles.schemeTitle}>
          <span role="img" aria-label="scheme">📜</span> {s.name}
        </div>
        <div className="scheme-category" style={styles.schemeCategory}>
          {LANGS[lang].category}
        </div>
        <div className="scheme-desc" style={styles.schemeDesc}>{s.description}</div>
        <div className="scheme-actions" style={styles.schemeActions}>
          <button
            style={styles.applyBtn}
            onClick={() => window.open(s.link, '_blank')}
            className="apply-btn"
          >
            {LANGS[lang].apply}
          </button>
          <button
            style={styles.youtubeBtn}
            onClick={() => window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(ytQuery), '_blank')}
            className="youtube-btn"
          >
            {LANGS[lang].youtube}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.body}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <img
            src="../assets/agri-icon.png"
            alt="Schemes Logo"
            style={{
              width: 54, height: 54, borderRadius: 12,
              boxShadow: "0 2px 8px #25602922"
            }}
          />
          <div>
            <h1 id="portal-title" style={styles.portalTitle}>
              <span role="img" aria-label="seedling" style={{ marginRight: 8, fontSize: '1.4rem', filter: 'drop-shadow(0 2px 2px #25602933)' }}>🌱</span>
              {LANGS[lang].title}
            </h1>
            <div className="header-sub" style={styles.headerSub}>{LANGS[lang].subtitle}</div>
          </div>
        </div>
        <div className="lang-dropdown" style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            id="lang-btn"
            aria-haspopup="listbox"
            style={{
              background: '#fff',
              color: '#388e3c',
              border: '1.5px solid #e0e0e0',
              padding: '0.5rem 1.1rem',
              borderRadius: 18,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: "0 2px 8px rgba(56,142,60,0.10)"
            }}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            🌐 <span id="lang-label">{LANGS[lang].langLabel}</span> <i className="fa fa-chevron-down" style={{ fontSize: '0.82em' }} />
          </button>
          {showDropdown && (
            <div
              id="lang-dropdown"
              className="dropdown-content"
              style={{
                display: 'block',
                position: 'absolute',
                right: 0,
                background: '#fff',
                minWidth: 120,
                boxShadow: "0 8px 32px rgba(56,142,60,0.18)",
                borderRadius: 10,
                zIndex: 100,
                marginTop: 8,
                border: "1.5px solid #e0e0e0",
                overflow: 'hidden'
              }}>
              <button className="lang-option"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '0.7rem 1.1rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#388e3c',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
                onClick={() => { setLang('en'); setShowDropdown(false); }}
              >🇬🇧 English</button>
              <button className="lang-option"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '0.7rem 1.1rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#388e3c',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
                onClick={() => { setLang('ta'); setShowDropdown(false); }}
              >🇮🇳 தமிழ்</button>
            </div>
          )}
        </div>
      </header>
      <main>
        <section style={{ maxWidth: 1200, margin: '0 auto' }}>
          {loading && <Spinner />}
          <div className="schemes-grid" style={styles.schemesGrid}>
            {(!loading && schemes.length > 0) && schemes.map(renderSchemeCard)}
          </div>
          {(!loading && (schemes.length === 0 || error)) && (
            <div className="no-schemes" style={styles.noSchemes}>
              {LANGS[lang].noSchemes}
            </div>
          )}
        </section>
      </main>
      <footer style={{
        marginTop: '3rem', padding: '2.5rem 0 1.2rem 0',
        textAlign: 'center', color: '#388e3c', fontSize: '1.08rem',
        background: 'linear-gradient(90deg,#e8f5e9 60%,#f7faf7 100%)',
        fontWeight: 500, letterSpacing: '0.04em',
        borderTop: '1.5px solid #e0e0e0',
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <span role="img" aria-label="leaf"><i className="fas fa-leaf" /></span>{" "}
          SmartUzhavan &mdash; Empowering Tamil Nadu Farmers
        </div>
        <div style={{ fontSize: '0.98rem', color: '#256029' }}>
          Schemes data is for informational purposes only. Always check official sources before applying.
        </div>
      </footer>
    </div>
  );
}

export default SchemesPortal;
