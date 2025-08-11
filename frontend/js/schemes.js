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

let currentLang = localStorage.getItem('schemes_lang') || 'en';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('schemes_lang', lang);
  document.getElementById('portal-title').textContent = LANGS[lang].title;
  document.getElementById('lang-label').textContent = LANGS[lang].langLabel;
  // Update subtitle if present
  const subtitleEl = document.querySelector('.header-sub');
  if (subtitleEl) subtitleEl.textContent = LANGS[lang].subtitle;
  fetchAndRenderSchemes();
}

function showSpinner(show) {
  document.getElementById('spinner').style.display = show ? 'block' : 'none';
}

function showNoSchemes(show) {
  document.getElementById('no-schemes').style.display = show ? 'block' : 'none';
}

async function fetchAndRenderSchemes() {
  showSpinner(true);
  showNoSchemes(false);
  const container = document.getElementById('schemes-container');
  container.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}?lang=${currentLang}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const schemes = await res.json();
    if (!schemes.length) {
      showNoSchemes(true);
      showSpinner(false);
      return;
    }
    schemes.forEach(s => {
      const card = document.createElement('div');
      card.className = 'scheme-card';
      // Compose YouTube query
      let ytQuery = s.name;
      if (currentLang === 'ta') {
        ytQuery += ' விவசாயி திட்டங்கள்';
      } else {
        ytQuery += ' farming scheme';
      }
      card.innerHTML = `
        <div class="scheme-title">${s.name}</div>
        <div class="scheme-category">${LANGS[currentLang].category}</div>
        <div class="scheme-desc">${s.description}</div>
        <div class="scheme-actions">
          <button class="apply-btn" onclick="window.open('${s.link}','_blank')">${LANGS[currentLang].apply}</button>
          <button class="youtube-btn" onclick="window.open('https://www.youtube.com/results?search_query='+encodeURIComponent('${ytQuery}'),'_blank')">${LANGS[currentLang].youtube}</button>
        </div>
      `;
      container.appendChild(card);
    });
    showSpinner(false);
  } catch (err) {
    showSpinner(false);
    showNoSchemes(true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Language dropdown
  const langBtn = document.getElementById('lang-btn');
  const langDropdown = document.getElementById('lang-dropdown');
  langBtn.addEventListener('click', () => {
    langDropdown.style.display = langDropdown.style.display === 'block' ? 'none' : 'block';
  });
  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.getAttribute('data-lang'));
      langDropdown.style.display = 'none';
    });
  });
  document.addEventListener('click', (e) => {
    if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
      langDropdown.style.display = 'none';
    }
  });
  setLanguage(currentLang);
}); 