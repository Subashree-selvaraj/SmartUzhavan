import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import './CropDisease.css'; // Your CSS file path
import { FaPaperclip } from 'react-icons/fa';
import { diseaseApi } from '../api/diseaseApi';

const translations = {
  en: {
    welcome: 'Welcome! Please upload a photo of the affected crop leaf to get a diagnosis.',
    uploading: 'Uploading your image...',
    detecting: 'Detecting disease, please wait...',
    crop: 'Crop',
    disease: 'Disease',
    suggestion: 'Suggestion',
    noVideo: 'No relevant video found.',
    error: 'An error occurred. Please try again.',
  },
  ta: {
    welcome: 'வணக்கம்! நோயறிதலைப் பெற, பாதிக்கப்பட்ட பயிர் இலையின் புகைப்படத்தைப் பதிவேற்றவும்.',
    uploading: 'உங்கள் படம் பதிவேற்றப்படுகிறது...',
    detecting: 'நோய் கண்டறியப்படுகிறது, காத்திருக்கவும்...',
    crop: 'பயிர்',
    disease: 'நோய்',
    suggestion: 'பரிந்துரை',
    noVideo: 'தொடர்புடைய வீடியோ எதுவும் கிடைக்கவில்லை.',
    error: 'ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
  },
};

const CropDiseaseDetectionChat = () => {
  const [currentLang, setCurrentLang] = useState('en');
  const [messages, setMessages] = useState([
    { sender: 'bot', content: translations.en.welcome },
  ]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null); // reserved for future enhancements
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [detectionData, setDetectionData] = useState(null);


  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load saved language on component mount
  useEffect(() => {
    const savedLang = localStorage.getItem('agri-lang') || 'en';
    setCurrentLang(savedLang);
    setMessages([{ sender: 'bot', content: translations[savedLang].welcome }]);
  }, []);

  // Language toggle handler
  const handleLangToggle = (lang) => {
    if (lang === currentLang) return; // No change, do nothing
    setCurrentLang(lang);
    localStorage.setItem('agri-lang', lang);
    // Update welcome message in messages: replace first bot message content
    setMessages((msgs) => {
      if (msgs.length === 0) return msgs;
      const updated = [...msgs];
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].sender === 'bot' && typeof updated[i].content === 'string') {
          updated[i].content = translations[lang].welcome;
          break;
        }
      }
      return updated;
    });
  };

  // Append a new message in chat
  const appendMessage = (sender, content) => {
    setMessages((prev) => [...prev, { sender, content }]);
  };

  // Handle file input change
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setSelectedImage(file); // Set selected image for sharing

    const reader = new FileReader();
    reader.onload = (event) => {
      // Get image dimensions to constrain size like original
      const img = new Image();
      img.onload = () => {
        const maxWidth = 200;
        const maxHeight = 200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }

        appendMessage(
          'user',
          <img
            src={event.target.result}
            alt="Uploaded"
            className="image-preview"
            style={{
              cursor: 'pointer',
              borderRadius: '8px',
              maxWidth: width,
              maxHeight: height,
            }}
          />
        );
        sendImageToBackend(file);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Send image to API backend
  const sendImageToBackend = async (file) => {
    appendMessage(
      'bot',
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    );

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`http://localhost:5000/api/predict?lang=${currentLang}`, {
        method: 'POST',
        body: formData,
      });

      // Remove typing indicator (last message)
      setMessages((prev) => prev.slice(0, -1));

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || translations[currentLang].error);
      }

      const data = await response.json();
      setDetectionData(data); // Store detection data for sharing
      displayPrediction(data);
    } catch (error) {
      appendMessage('bot', <p>{error.message}</p>);
    }
  };

  // Display prediction response
  const displayPrediction = (data) => {
    const isTamil = currentLang === 'ta';
    const cropName = isTamil ? (data.crop_ta || data.crop) : data.crop;
    const diseaseName = isTamil ? (data.disease_ta || data.disease) : data.disease;

    const expertAdviceContent = data.expertAdvice ? (
      <div className="expert-advice">
        <h4>{isTamil ? 'நிபுணர் ஆலோசனை' : 'Expert Advice'}:</h4>
        <div
          className="markdown-advice"
          dangerouslySetInnerHTML={{ __html: marked.parse(data.expertAdvice) }}
        />
      </div>
    ) : (
      <p>
        <strong>{translations[currentLang].suggestion}:</strong>{' '}
        {isTamil ? data.suggestion?.ta : data.suggestion?.en}
      </p>
    );

    const videoEmbed = data.videoUrl ? (
      <div className="youtube-embed">
        <iframe
          src={data.videoUrl}
          title="Related video"
          allowFullScreen
          frameBorder="0"
          width="100%"
          height="315"
          style={{ borderRadius: '8px' }}
        />
      </div>
    ) : (
      <p>{translations[currentLang].noVideo}</p>
    );

    const confidence = data.confidence ? (
      <p>
        <strong>{isTamil ? 'நம்பிக்கை' : 'Confidence'}:</strong>{' '}
        {(data.confidence * 100).toFixed(2)}%
      </p>
    ) : null;

    const resultContent = (
      <div className="prediction-result">
        <p>
          <strong>{translations[currentLang].crop}:</strong> {cropName}
        </p>
        <p>
          <strong>{translations[currentLang].disease}:</strong> {diseaseName}
        </p>
        {confidence}
        {expertAdviceContent}
        {videoEmbed}
      </div>
    );

    appendMessage('bot', resultContent);
    // Show share button after displaying prediction
    setShowShareModal(true);
  };

  const shareWithCommunity = async () => {
    setShareLoading(true);
    try {
      // Attempt to get location automatically
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        await diseaseApi.postReport({
          farmerName: detectionData.farmerName || "Anonymous",
          cropName: detectionData.crop,
          diseaseName: detectionData.disease,
          severity: detectionData.severity || "moderate",
          imageUrl: detectionData.imageUrl,
          latitude,
          longitude,
          reportedBy: "CropDisease Detection"
        });
        appendMessage('bot', 'Detection shared successfully with the community!');
      }, async (error) => {
        // If geolocation fails, share without location (default coordinates)
        await diseaseApi.postReport({
          farmerName: detectionData.farmerName || "Anonymous",
          cropName: detectionData.crop,
          diseaseName: detectionData.disease,
          severity: detectionData.severity || "moderate",
          imageUrl: detectionData.imageUrl,
          latitude: 11.0168, // Default to Tamil Nadu center
          longitude: 76.9558,
          reportedBy: "CropDisease Detection"
        });
        appendMessage('bot', 'Detection shared successfully (location not available).');
      });
      setShowShareModal(false);
    } catch (err) {
      appendMessage('bot', 'Failed to share detection. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const declineSharing = () => {
    setShowShareModal(false);
    appendMessage('bot', 'Sharing declined.');
  };

  return (
    <div
      className="wrapper"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 800,paddingTop: '100px', margin: '0 auto' }}
    >
      {/* Language switching buttons inside chat container, above messages */}
      <div
        className="lang-toggle"
        style={{
          display: 'flex',
          justifyContent: 'center',
          backgroundColor: 'rgba(56, 142, 60, 0.8)', // nice greenish background
          padding: '0.6rem',
          borderRadius: '12px',
          margin: '1rem 0',
        }}
        onClick={(e) => {
          if (e.target.tagName === 'BUTTON') {
            const lang = e.target.dataset.lang;
            handleLangToggle(lang);
          }
        }}
      >
        <button
          type="button"
          className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
          data-lang="en"
          style={{
            background: currentLang === 'en' ? '#fff' : 'transparent',
            color: currentLang === 'en' ? '#388e3c' : '#fff',
            border: 'none',
            padding: '0.4rem 1rem',
            borderRadius: '15px',
            cursor: 'pointer',
            fontWeight: 600,
            marginRight: '0.5rem',
            transition: 'background 0.2s',
          }}
        >
          EN
        </button>
        <button
          type="button"
          className={`lang-btn ${currentLang === 'ta' ? 'active' : ''}`}
          data-lang="ta"
          style={{
            background: currentLang === 'ta' ? '#fff' : 'transparent',
            color: currentLang === 'ta' ? '#388e3c' : '#fff',
            border: 'none',
            padding: '0.4rem 1rem',
            borderRadius: '15px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
        >
          TA
        </button>
      </div>

      <main
        className="chat-container"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(56,142,60,0.13)',
          overflow: 'hidden',
          padding: '1.5rem',
        }}
      >
        <div
          id="chat-messages"
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message ${msg.sender}`}
              style={{
                display: 'flex',
                maxWidth: '80%',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <div
                className="message-content"
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: 12,
                  lineHeight: 1.5,
                  backgroundColor: msg.sender === 'bot' ? '#e8f5e9' : '#388e3c',
                  color: msg.sender === 'bot' ? '#333' : '#fff',
                  wordBreak: 'break-word',
                }}
              >
                {typeof msg.content === 'string' ? <p style={{ margin: 0 }}>{msg.content}</p> : msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div
          className="chat-input"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem 0 0 0',
            borderTop: '1px solid #eee',
            background: '#f9f9f9',
          }}
        >
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
            ref={fileInputRef}
          />
          <button
            id="upload-btn"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              background: '#388e3c',
              color: '#fff',
              border: 'none',
              padding: '0.8rem 1.2rem',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#256029')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#388e3c')}
          >
            <FaPaperclip style={{ marginRight: '0.5rem' }} /> Upload Image
          </button>
          <p id="file-name" style={{ marginLeft: '1rem', color: '#555', fontStyle: 'italic' }}>
            {fileName}
          </p>
        </div>
      </main>

        {/* Share Modal */}
        {showShareModal && (
          <div className="share-modal-overlay">
            <div className="share-modal">
              <h3>Share with Community</h3>
              <p>Do you want to share this detection with your farming community? (Location will be auto-detected)</p>
              <div className="share-modal-buttons">
                <button
                  onClick={shareWithCommunity}
                  disabled={shareLoading}
                  className="btn-share"
                >
                  {shareLoading ? 'Sharing...' : 'Yes, Share'}
                </button>
                <button
                  onClick={declineSharing}
                  className="btn-decline"
                >
                  No, Thanks
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disease Map Button */}
        <div className="disease-map-section">
          <a href="/disease-map" className="btn-disease-map">
            <i className="fas fa-map-marked-alt"></i>
            View Disease Map
          </a>
        </div>
      </div>
  );
};

export default CropDiseaseDetectionChat;