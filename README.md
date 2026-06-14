# 🌾 SmartUzhavan – Where Technology Meets Tamil Agriculture

> **Empowering farmers through AI, real-time insights, and native language support**

![Banner](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square) ![Tech Stack](https://img.shields.io/badge/Stack-MERN-blue?style=flat-square) ![Language](https://img.shields.io/badge/Languages-Tamil%20%26%20English-orange?style=flat-square)

---

## 🎯 The Challenge

Every year, thousands of farmers in Tamil Nadu face preventable losses due to:

- 🌾 **Unidentified crop diseases** that spread rapidly
- 🌧️ **Weather surprises** that catch them unprepared  
- 💰 **Market price mysteries** with no transparency
- 📋 **Government schemes hidden in bureaucracy**
- 🔤 **Language barriers** in digital farming tools

**SmartUzhavan solves all of these. In one app. In their language.**

---

## ✨ What Makes SmartUzhavan Different?

### 🤖 AI Crop Disease Detective
Upload a photo, get instant diagnosis. The AI identifies crop diseases, suggests treatments, and links you to expert videos—all in seconds.

```
📸 Photo → 🧠 AI Analysis → 🎯 Diagnosis + Treatment → 📺 Video Tutorials
```

### 🗺️ Live Disease Outbreak Map
See what's happening in your region in real-time. Farmers are flagging diseased crops anonymously, creating a **community early-warning system**.

### 🌿 Crop Health Scoring (NDVI)
Our satellite-based technology calculates crop stress before your eyes do. Know exactly which fields need attention.

### 🎤 Voice-Powered Farming AI
Ask questions in Tamil or English—speak or type. Get answers about fertilizers, pest control, irrigation, and seasonal crops instantly.

> *"Why are my paddy leaves yellowing?"* → Instant answer with solutions

### 🌡️ Smart Weather Planning
Real-time forecasts + agricultural advice:
- Skip watering before heavy rain
- Plan fertilizer application in ideal conditions
- Stay ahead of temperature swings

### 💹 Market Price Transparency
No middlemen, no surprises. Track crop prices across Tamil Nadu mandis and sell at the right time.

### 🏛️ Government Schemes at Your Fingertips
Subsidies, crop insurance, agricultural loans—all automatically updated and discoverable. We scrape government sites so you don't have to.

### 📚 Learning Hub
Curated agricultural education:
- Modern farming techniques
- Organic methods
- Irrigation best practices
- Integrated pest management

---

## 🏗️ How It Works (Architecture)

```
┌─────────────────────────────────────────────────────┐
│              🌾 Farmer Interface                     │
│         (React Web + PWA Offline Support)           │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│         Express.js REST API & WebSockets            │
│              (Real-time Updates)                     │
└──────┬──────────────┬──────────────┬────────────────┘
       │              │              │
       ▼              ▼              ▼
  ┌────────┐   ┌──────────┐   ┌──────────┐
  │ MongoDB│   │  Firebase│   │  External│
  │Database│   │  Auth    │   │  APIs    │
  └────────┘   └──────────┘   └──────────┘
       │
  ┌────┴──────────────────────┐
  ▼                           ▼
AI Engine              Automation Services
├─ Disease Detection      ├─ Weather Sync
├─ Chat Assistant         ├─ Price Scraping
└─ Recommendations        └─ Scheme Updates
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js, React Router, Bootstrap, Axios, PWA |
| **Backend** | Node.js, Express.js, WebSockets (Socket.IO) |
| **Database** | MongoDB |
| **AI/ML** | Custom Disease Detection, NLP Chat |
| **Language** | Microsoft Azure Speech Services |
| **APIs** | OpenWeatherMap, YouTube Data, Google Maps |
| **Authentication** | Firebase Auth |
| **Web Scraping** | Puppeteer |
| **Remote Sensing** | NDVI (Satellite) Analysis |
| **Deployment** | Render, Netlify, Vercel |

---

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env           # Add MongoDB URI, API keys
npm run dev                    # Development server
node scheduler.js             # Automated scraping jobs
```

### React Frontend
```bash
cd folder1
npm install
cp .env.example .env           # Add Firebase keys
npm start                      # React dev server (port 3000)
```

### Static Frontend (PWA)
```bash
cd frontend
npx serve .                    # Serve locally or
# Deploy to Netlify/Vercel for live hosting
```

---

## 📁 Project Structure

```
SmartUzhavan/
│
├── backend/
│   ├── server.js              # Express server
│   ├── scheduler.js           # Automated jobs (weather, prices, schemes)
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API endpoints
│   ├── utils/                 # Helper functions
│   ├── .env                   # Secrets (never commit!)
│   └── package.json
│
├── folder1/                   # React Dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   └── package.json
│
├── frontend/                  # PWA + Offline Support
│   ├── index.html
│   ├── script.js
│   ├── styles.css
│   ├── service-worker.js      # Offline magic ✨
│   ├── manifest.json          # PWA config
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── pages/
│
└── README.md
```

---

## 🔒 Security First

✅ Firebase Authentication  
✅ Encrypted API routes  
✅ Role-based access control  
✅ Input validation & sanitization  
✅ Environment variables for secrets  
✅ HTTPS enforced in production  

---

## 📊 Feature Roadmap

| Phase | Features |
|-------|----------|
| **v1.0** (Current) | Disease detection, weather, prices, schemes, chat |
| **v2.0** | Mobile app (iOS/Android), SMS support |
| **v3.0** | IoT soil sensors, yield prediction AI |
| **v4.0** | Satellite monitoring, voice calls for illiterate farmers |

---

## 📈 Impact by the Numbers

- 🌾 **1000+** Crop diseases in database
- 🗺️ **Real-time** outbreak monitoring across Tamil Nadu
- 💰 **100+ Government Schemes** auto-updated weekly
- 🎤 **2 Languages** (Tamil + English)
- 🔋 **100% Offline** capable via PWA

---

## 🌐 Demo & Links

- 🔗 **Demo:** [Your deployment link](https://drive.google.com/file/d/1DWGt9nYvDrVse1_p1UOZoppydW8cCjvQ/view?usp=sharing)
- 📦 **GitHub:** [SmartUzhavan](https://github.com/Subashree-selvaraj/SmartUzhavan)


---

## 🤝 Contributing

Got ideas? Found a bug? Help us improve SmartUzhavan:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support & Feedback

Have questions or suggestions?
- 📧 Open an issue on GitHub
- 💬 Start a discussion
- 🐛 Report bugs with details

---

## 📜 License

This project is open source and available under the MIT License.

---

## 👩‍💻 About

**Created by:** Subashree S  


---

### 🌱 Every farmer deserves access to world-class technology—in their language.

**SmartUzhavan makes it happen.**

---

*Last Updated: June 2026* | [View Changelog](#)
