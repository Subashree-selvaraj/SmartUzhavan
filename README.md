#🌱 SmartUzhavan (dynamos)
A modern web platform for Tamil Nadu farmers providing:
✅ Real-time weather updates
✅ Market prices for crops
✅ Government schemes & news
✅ PWA with offline support


## Project Structure

```
dynamos/
│
├── backend/         # Node.js, Express, MongoDB, Puppeteer scraping
│   ├── .env
│   ├── package.json
│   ├── server.js
│   ├── scheduler.js
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── ...
│
├── folder1/ # React frontend (modern UI for farmers)
│ ├── src/
│ ├── public/
│ ├── package.json
│ ├── .env
│ └── ...
│
├── frontend/        # Static HTML/CSS/JS, PWA, service worker
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── service-worker.js
│   ├── manifest.json
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── ...
│
├── .gitignore
├── README.md
```


---

## 🚀 Setup Guide

### 🔹 Backend
`cd backend`
`npm install`
cp .env.example .env   # Fill in MongoDB URI, Azure Translator Key, etc.
`npm run dev`            # Start development server
`node scheduler.js`      # Run scheduled scraping (or use pm2/cron)

### 🔹 React Frontend (folder1)
`cd folder1`
`npm install`
cp .env.example .env   # Add Firebase / API keys
`npm start `            # Start React dev server

### Frontend
1. `cd frontend`
2. Serve with any static server (e.g. `npx serve .` or deploy to Netlify/Vercel)
3. For local dev, open `index.html` directly or use a static server

## Deployment
- **Backend:** Deploy `/backend` as a Node.js app (Render, Heroku, Azure, etc.)
- **Frontend:** Deploy `/frontend` as static files (Netlify, Vercel, or serve via Express in production)

## Notes
- All sensitive info should be in `.env` (never commit secrets)
- Service worker is set up for PWA/offline; see `service-worker.js` for dev/prod config
- Scraping is done with Puppeteer and Azure Translator at scrape time

---

For more details, see the `README.md` in each subfolder. 
