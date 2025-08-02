// --- CONFIG ---
const YT_API_KEY = 'your api key'; // <-- Replace with your API key
const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const DEFAULT_QUERY = 'விவசாயம் விவசாயி Tamil farming'; // Tamil farming/farmer
const DEFAULT_TAGS = [
    'விவசாயம்', // Farming
    'ஆர்கானிக் விவசாயம்', // Organic farming
    'விவசாய இயந்திரங்கள்', // Machinery
    'பயிர்கள்', // Crops
    'விவசாய தொழில்நுட்பம்', // Technology
    'பாசனம்', // Irrigation
    'சந்தை விவசாயம்' // Market
];
const MAX_RESULTS = 12;

const translations = {
    en: {
        ytTitle: 'Agri & Farming YouTube Videos',
        searchPlaceholder: 'Search for agri/farming videos...',
        searchBtn: 'Search',
        tags: ['Farming', 'Organic', 'Machinery', 'Crops', 'Technology', 'Irrigation', 'Market']
    },
    ta: {
        ytTitle: 'விவசாய YouTube வீடியோக்கள்',
        searchPlaceholder: 'விவசாய/பண்ணை வீடியோக்களை தேடுங்கள்...',
        searchBtn: 'தேடு',
        tags: ['விவசாயம்', 'ஆர்கானிக்', 'இயந்திரங்கள்', 'பயிர்கள்', 'தொழில்நுட்பம்', 'பாசனம்', 'சந்தை']
    }
};

let currentLang = 'ta'; // Default to Tamil

function setLanguage(lang) {
    currentLang = lang;
    document.querySelector('[data-lang="ytTitle"]').textContent = translations[lang].ytTitle;
    document.getElementById('yt-search-input').placeholder = translations[lang].searchPlaceholder;
    document.getElementById('yt-search-btn').textContent = translations[lang].searchBtn;
    // Update tags
    const tagBtns = document.querySelectorAll('.yt-tag');
    tagBtns.forEach((btn, i) => {
        btn.textContent = translations[lang].tags[i];
    });
    document.getElementById('lang-label').textContent = lang === 'en' ? 'English' : 'தமிழ்';
}

// Language switcher
const langBtn = document.getElementById('lang-btn');
const langDropdown = document.getElementById('lang-dropdown');
langBtn.addEventListener('click', () => {
    langDropdown.style.display = langDropdown.style.display === 'none' ? 'block' : 'none';
});
document.querySelectorAll('#lang-dropdown .lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setLanguage(btn.getAttribute('data-lang'));
        langDropdown.style.display = 'none';
        // When language changes, do a search in that language
        if (btn.getAttribute('data-lang') === 'ta') {
            doSearch(DEFAULT_QUERY);
        } else {
            doSearch('farming agriculture');
        }
    });
});

document.addEventListener('click', (e) => {
    if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
        langDropdown.style.display = 'none';
    }
});

// --- YOUTUBE FETCH ---
async function fetchVideos(query) {
    const params = new URLSearchParams({
        key: YT_API_KEY,
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: MAX_RESULTS,
        relevanceLanguage: currentLang === 'ta' ? 'ta' : 'en',
        regionCode: 'IN'
    });
    try {
        const res = await fetch(`${YT_SEARCH_URL}?${params.toString()}`);
        if (!res.ok) {
            let errorText = await res.text();
            console.error('YouTube API error:', errorText);
            renderVideos([]);
            return;
        }
        const text = await res.text();
        if (!text) {
            console.error('YouTube API returned empty response');
            renderVideos([]);
            return;
        }
        let data;
        try {
            data = JSON.parse(text);
        } catch (jsonErr) {
            console.error('Failed to parse YouTube API response as JSON:', jsonErr, 'Raw response:', text);
            renderVideos([]);
            return;
        }
        if (!data.items) {
            console.error('YouTube API returned no items:', data);
            renderVideos([]);
            return;
        }
        const videos = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle
        }));
        renderVideos(videos);
    } catch (err) {
        console.error('Fetch error:', err);
        renderVideos([]);
    }
}

function renderVideos(videos) {
    const grid = document.getElementById('yt-grid');
    grid.innerHTML = '';
    if (!videos.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;">No videos found.</div>';
        return;
    }
    videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'yt-card';
        card.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${v.id}" allowfullscreen></iframe>
            <div class="yt-info">
                <div class="yt-title">${v.title}</div>
                <div class="yt-channel">${v.channel}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- SEARCH & TAGS ---
function doSearch(query) {
    fetchVideos(query);
}

document.getElementById('yt-search-btn').addEventListener('click', () => {
    const val = document.getElementById('yt-search-input').value.trim();
    doSearch(val || DEFAULT_QUERY);
});
document.getElementById('yt-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = document.getElementById('yt-search-input').value.trim();
        doSearch(val || DEFAULT_QUERY);
    }
});
document.querySelectorAll('.yt-tag').forEach((btn, i) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.yt-tag').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        doSearch(DEFAULT_TAGS[i]);
    });
});

// --- INIT ---
setLanguage('ta');
doSearch(DEFAULT_QUERY); 