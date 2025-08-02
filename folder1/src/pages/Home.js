// Home.js
import React, { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QuoteSection from "../components/QuoteSection";
import {
  FaLeaf,
  FaChartLine,
  FaCloudSun,
  FaHandshake,
  FaYoutube,
  FaRobot,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaSeedling,
  FaLightbulb,
  FaArrowRight,
} from "react-icons/fa";
import { motion, useInView } from "framer-motion";
import { LanguageContext } from "../LanguageContext";  // Make sure this file exists and provides `lang`
import "./Home.css";

// Floating icon animation component
const FloatingIcon = ({ icon, delay = 0 }) => (
  <motion.div
    className="floating-icon"
    initial={{ y: 0, rotate: 0 }}
    animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
    transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    {icon}
  </motion.div>
);

// Animated counter component
const AnimatedCounter = ({ target, duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const step = target / (duration * 60);
      const timer = setInterval(() => {
        start += step;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 1000 / 60);
      return () => clearInterval(timer);
    }
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

const MotionLink = motion(Link);

// Language strings -- keep your translations here
const LANGUAGES = {
  en: {
    name: "SmartUzhavan",
    heroSubtitle: "Empowering Tamil Nadu Farmers with Modern Technology and Traditional Wisdom",
    getStarted: "Get Started",
    watchDemo: "Watch Demo",
    ourServices: "Our Services",
    servicesSubtitle: "Comprehensive solutions for modern agriculture",
    aboutTitle: "About SmartUzhavan",
    aboutDesc1:
      "SmartUzhavan is a comprehensive digital platform designed specifically for Tamil Nadu farmers.",
    aboutDesc2:
      "We combine cutting-edge technology with deep understanding of local agricultural practices to provide farmers with the tools they need to succeed in modern agriculture.",
    happyFarmers: "Happy Farmers",
    cropsAnalyzed: "Crops Analyzed",
    accuracyRate: "Accuracy Rate",
    exploreNow: "Explore Now",
    footerQuote:
      '"Agriculture is our wisest pursuit, because it will in the end contribute most to real wealth, good morals, and happiness." - Thomas Jefferson',
    aboutUs: "About Us",
    contact: "Contact",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    copyright:
      "© 2024 SmartUzhavan. All rights reserved. Built with ❤️ for Tamil Nadu farmers.",
  },
  ta: {
    name: "ஸ்மார்ட் உழவன்",
    heroSubtitle:
      "நவீன தொழில்நுட்பமும் பாரம்பரிய ஞானமும் கொண்டு தமிழ்நாடு விவசாயிகளுக்கு அதிகாரம் சேர்க்கிறது",
    getStarted: "ஆரம்பிக்கவும்",
    watchDemo: "டெமோவைப் பாருங்கள்",
    ourServices: "எங்கள் சேவைகள்",
    servicesSubtitle: "முழுமையான விவசாய தீர்வுகள்",
    aboutTitle: "ஸ்மார்ட் உழவனை பற்றி",
    aboutDesc1:
      "ஸ்மார்ட் உழவன் தமிழ்நாடு விவசாயிகளுக்காக உருவாக்கப்பட்ட முழுமையான டிஜிட்டல் தளம் ஆகும்.",
    aboutDesc2:
      "நாங்கள் நவீன தொழில்நுட்பத்தையும் உள்ளூர் விவசாய நடைமுறைகளையும் ஆழமாக புரிந்துணர்வையும் இணைத்து விவசாயிகளுக்கு வெற்றிகரமாக விளை முடிக்க தேவையான சாதனங்களை வழங்குகிறோம்.",
    happyFarmers: "மகிழ்ந்த விவசாயிகள்",
    cropsAnalyzed: "பயிர்கள் ஆய்வு செய்யப்பட்டன",
    accuracyRate: "நாங்கள் உறுதியாக உறுதிப்படுத்திய வீதம்",
    exploreNow: "இப்போது ஆராயவும்",
    footerQuote:
      "கிருஷிகாரியம் நம் ஆழ்ந்த முயற்சியாகும், ஏனெனில் அது இறுதியில் உண்மை செல்வமும் நல்ல நற்றுணர்வும் மகிழ்ச்சியும் பெருக்குகிறது. - தலைவன் ஜெஃபர்சன்",
    aboutUs: "எங்களை பற்றி",
    contact: "தொடர்பு கொள்ளவும்",
    privacy: "உரிமைக் கொள்கை",
    terms: "சட்ட நிபந்தனைகள்",
    copyright:
      "© 2024 ஸ்மார்ட் உழவன். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை. தமிழ்நாடு விவசாயிகளுக்காக அன்புடன் செய்யப்பட்டது.",
  },
};

// Bilingual feature cards
const featuresData = [
  {
    to: "/crop-disease",
    icon: <FaLeaf />,
    enTitle: "Crop Disease Detection",
    taTitle: "பயிர் நோய் கண்டறிதல்",
    enDesc:
      "Upload photos of your crops and get instant AI-powered disease identification with treatment recommendations.",
    taDesc:
      "உங்கள் பயிர்களின் புகைப்படங்களை பதிவேற்றவும் மற்றும் கணினி காட்சியினால் உடனடி நோய் கண்டறிதல் மற்றும் சிகிச்சை பரிந்துரைகளைப் பெறவும்.",
    gradient: "linear-gradient(135deg, #4CAF50, #81C784)",
  },
  {
    to: "/market-prices",
    icon: <FaChartLine />,
    enTitle: "Market Prices",
    taTitle: "சந்தை விலை",
    enDesc:
      "Get real-time market prices for all major crops across Tamil Nadu mandis and make informed selling decisions.",
    taDesc:
      "தமிழ்நாடு மண்டிகளின் அனைத்து முக்கிய பயிர்களுக்கும் நேரடி சந்தை விலையில் அறிந்துகொண்டு விற்பனை முடிவுகளை எடுக்கவும்.",
    gradient: "linear-gradient(135deg, #2196F3, #64B5F6)",
  },
  {
    to: "/weather",
    icon: <FaCloudSun />,
    enTitle: "Weather Forecast",
    taTitle: "வானிலை முன்னறிவு",
    enDesc:
      "Access detailed weather forecasts and agricultural recommendations based on upcoming weather conditions.",
    taDesc:
      "வரவிருக்கும் வானிலை நிலைகளின் அடிப்படையில் முழுமையான வானிலை தகவல்கள் மற்றும் விவசாய பரிந்துரைகளைப் பெறுங்கள்.",
    gradient: "linear-gradient(135deg, #FF9800, #FFB74D)",
  },
  {
    to: "/schemes",
    icon: <FaHandshake />,
    enTitle: "Government Schemes",
    taTitle: "அரசு திட்டங்கள்",
    enDesc:
      "Discover and apply for various government schemes and subsidies available for Tamil Nadu farmers.",
    taDesc:
      "தமிழ்நாடு விவசாயிகளுக்கான பல அரசுத் திட்டங்கள் மற்றும் உதவித்தொகைகளைக் கண்டுபிடித்து விண்ணப்பியுங்கள்.",
    gradient: "linear-gradient(135deg, #9C27B0, #BA68C8)",
  },
  {
    to: "/youtube-refs",
    icon: <FaYoutube />,
    enTitle: "Educational Videos",
    taTitle: "கல்வி வீடியோக்கள்",
    enDesc:
      "Watch curated educational videos on modern farming techniques, pest management, and crop cultivation.",
    taDesc:
      "நவீன விவசாய முறைகள், கிருமி மேலாண்மை, மற்றும் பயிர் வளர்ப்பு பற்றிய தேர்ந்தெடுக்கப்பட்ட கல்வி வீடியோக்களைப் பார்க்கவும்.",
    gradient: "linear-gradient(135deg, #F44336, #EF5350)",
  },
  {
    to: "/ai-assistant",
    icon: <FaRobot />,
    enTitle: "AI Assistant",
    taTitle: "AI உதவியாளர்",
    enDesc:
      "Chat with our AI-powered agricultural assistant for instant answers to your farming questions.",
    taDesc:
      "உங்கள் விவசாய சார் ந்த கேள்விகளுக்கு உடனடி பதில்களை பெற எமது AI சகாயி உடன் உரையாடவும்.",
    gradient: "linear-gradient(135deg, #607D8B, #90A4AE)",
  },
];

// Animation variants for framer-motion
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.8, rotateX: 45 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 100, damping: 12, duration: 0.8 },
  },
  hover: {
    scale: 1.05,
    y: -10,
    rotateY: 5,
    boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
    transition: { duration: 0.3 },
  },
};
const textVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
const titleVariants = { hidden: { opacity: 0, scale: 0.8, rotateX: 90 }, visible: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 1.2, ease: "easeOut" } } };

const Home = () => {
  const { lang } = useContext(LanguageContext) || { lang: 'en' };
  const currentLang = lang || 'en';
  
  // Early return with loading state if LANGUAGES[currentLang] is not available
  if (!LANGUAGES[currentLang]) {
    return <div>Loading...</div>;
  }

  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <section
        className="hero-section hero-img-bg"
        style={{
          width: "100vw",
          minHeight: "100vh",
          height: "100svh",
          position: "relative",
          zIndex: 1,
          paddingTop: "120px", // Adjust if your navbar height changes
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          textAlign: "center",
          color: "white",
        }}
      >
        <motion.div className="floating-elements">
          <FloatingIcon icon={<FaSeedling />} delay={0} />
          <FloatingIcon icon={<FaLeaf />} delay={1} />
          <FloatingIcon icon={<FaLightbulb />} delay={2} />
        </motion.div>
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="hero-content">
          <motion.h1 variants={titleVariants} className="hero-heading-advanced">
            <span className="gradient-text">{LANGUAGES[currentLang].name}</span>
          </motion.h1>
          <motion.p variants={textVariants} className="hero-subheading-advanced">
            {LANGUAGES[currentLang].heroSubtitle}
          </motion.p>
          <motion.div className="hero-stats" variants={containerVariants} style={{ justifyContent: "center", gap: "2rem", display: "flex", flexWrap: "wrap" }}>
            <motion.div className="stat-item" variants={textVariants} style={{ minWidth: "110px" }}>
              <div className="stat-number"><AnimatedCounter target={10000} />+</div>
              <div className="stat-label">{LANGUAGES[currentLang].happyFarmers}</div>
            </motion.div>
            <motion.div className="stat-item" variants={textVariants} style={{ minWidth: "110px" }}>
              <div className="stat-number"><AnimatedCounter target={500} />+</div>
              <div className="stat-label">{LANGUAGES[currentLang].cropsAnalyzed}</div>
            </motion.div>
            <motion.div className="stat-item" variants={textVariants} style={{ minWidth: "110px" }}>
              <div className="stat-number"><AnimatedCounter target={95} />%</div>
              <div className="stat-label">{LANGUAGES[currentLang].accuracyRate}</div>
            </motion.div>
          </motion.div>
          <motion.div className="hero-buttons" variants={textVariants} style={{ gap: "1rem", display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            <MotionLink to="/crop-disease" className="btn-primary-advanced" whileHover={{ scale: 1.05 }}>
              <span>{LANGUAGES[currentLang].getStarted}</span>
              <FaArrowRight className="btn-icon" />
            </MotionLink>
            <motion.button className="btn-secondary-advanced" whileHover={{ scale: 1.05 }}>
              {LANGUAGES[currentLang].watchDemo}
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section-advanced" style={{ background: "#fff" }}>
        <div className="container">
          <motion.h2
            className="section-title-advanced"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {LANGUAGES[currentLang].ourServices}
          </motion.h2>
          <motion.p
            className="section-subtitle"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {LANGUAGES[currentLang].servicesSubtitle}
          </motion.p>
          <motion.div className="features-grid-advanced" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {featuresData.map((feature, idx) => (
              <MotionLink key={idx} to={feature.to} className="feature-card-advanced" variants={cardVariants} whileHover="hover" custom={idx}>
                <div className="card-background" style={{ background: feature.gradient }} />
                <div className="card-content">
                  <motion.div className="feature-icon-advanced" whileHover={{ rotate: 360, scale: 1.2 }} transition={{ duration: 0.6 }}>
                    {feature.icon}
                  </motion.div>
                  <h3 className="feature-title-advanced">{currentLang === "en" ? feature.enTitle : feature.taTitle}</h3>
                  <p className="feature-description">{currentLang === "en" ? feature.enDesc : feature.taDesc}</p>
                  <motion.div className="card-hover-overlay" initial={{ opacity: 0 }} whileHover={{ opacity: 1 }}>
                    <span className="explore-text">{LANGUAGES[currentLang].exploreNow}</span>
                    <FaArrowRight />
                  </motion.div>
                </div>
              </MotionLink>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section
        className="about-section-advanced"
        style={{ background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 70%, #E8F5E9 100%)", color: "#204020" }}
      >
        <div className="container">
          <motion.div className="about-content-advanced" initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            <motion.div className="about-image-advanced" initial={{ x: -100, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }}>
              <div className="image-container" style={{ boxShadow: "0 14px 48px rgba(67,160,71,0.07)" }}>
                <img src="/about-image.jpg" alt="Tamil Nadu Farmers" />
              </div>
            </motion.div>
            <motion.div className="about-text-advanced" initial={{ x: 100, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} viewport={{ once: true }} style={{ paddingLeft: 40, paddingRight: 20 }}>
              <h2 className="about-title">
                {currentLang === "en" ? "About" : "பற்றி"} <span className="gradient-text" style={{ color: "#4CAF50" }}>{LANGUAGES[currentLang].name}</span>
              </h2>
              <p className="about-description" style={{ fontSize: "1.14rem", maxWidth: 600 }}>
                {LANGUAGES[currentLang].aboutDesc1}
                <br />
                {LANGUAGES[currentLang].aboutDesc2}
              </p>
              <div className="about-features" style={{ marginTop: 30 }}>
                <div className="about-feature">
                  <FaLeaf className="feature-icon-small" style={{ color: "#43a047" }} />
                  <span>{currentLang === "en" ? "AI-Powered Disease Detection" : "AI-சகாயம் நோய் கண்டறிதல்"}</span>
                </div>
                <div className="about-feature">
                  <FaChartLine className="feature-icon-small" style={{ color: "#82b1ff" }} />
                  <span>{currentLang === "en" ? "Real-time Market Prices" : "நேரடி சந்தை விலை"}</span>
                </div>
                <div className="about-feature">
                  <FaCloudSun className="feature-icon-small" style={{ color: "#FF9800" }} />
                  <span>{currentLang === "en" ? "Weather Forecasting" : "வானிலை முன்னறிவு"}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-section-advanced">
        <div className="container">
          <motion.div className="footer-content-advanced" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <QuoteSection />
            <motion.div className="social-icons-advanced" variants={containerVariants} initial="hidden" whileInView="visible">
              <motion.a 
                href="https://facebook.com/smartuzhavan" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-icon-advanced" 
                variants={textVariants} 
                aria-label="Facebook"
              >
                <FaFacebookF />
              </motion.a>
              <motion.a 
                href="https://twitter.com/smartuzhavan" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-icon-advanced" 
                variants={textVariants} 
                aria-label="Twitter"
              >
                <FaTwitter />
              </motion.a>
              <motion.a 
                href="https://instagram.com/smartuzhavan" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-icon-advanced" 
                variants={textVariants} 
                aria-label="Instagram"
              >
                <FaInstagram />
              </motion.a>
              <motion.a 
                href="https://youtube.com/@smartuzhavan" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-icon-advanced" 
                variants={textVariants} 
                aria-label="YouTube"
              >
                <FaYoutube />
              </motion.a>
            </motion.div>
            <div className="footer-links-advanced">
              <Link to="/about">{LANGUAGES[currentLang].aboutUs}</Link>
              <span className="divider">|</span>
              <Link to="/contact">{LANGUAGES[currentLang].contact}</Link>
              <span className="divider">|</span>
              <Link to="/privacy">{LANGUAGES[currentLang].privacy}</Link>
              <span className="divider">|</span>
              <Link to="/terms">{LANGUAGES[currentLang].terms}</Link>
            </div>
            <div className="copyright-advanced">
              <p>{LANGUAGES[currentLang].copyright}</p>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
