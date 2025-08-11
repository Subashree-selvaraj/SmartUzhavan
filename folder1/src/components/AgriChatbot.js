import React, { useState, useRef, useEffect } from 'react';
import './AgriChatbot.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

const AgriChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('auto');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const GEMINI_API_KEY = 'AIzaSyDThNYvkIr1X0cwjMKtkIO5tXRsxxVAAN4';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  const SESSION_ID = 'chatbot_session_' + Date.now();

  // Function to call Gemini API directly
  const callGeminiAPI = async (prompt, imageData = null) => {
    try {
      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      };

      // Add image if provided
      if (imageData) {
        requestBody.contents[0].parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: imageData
          }
        });
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn\'t generate a response.';
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      addWelcomeMessage();
    }
    // Load speech synthesis voices
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: Date.now(),
      content: `வணக்கம்! I'm your Agriculture Expert Assistant. I can help you with:

🌾 Crop cultivation advice
🌡️ Weather-based farming tips
🐛 Pest and disease identification
💰 Market price information
🏛️ Government scheme guidance
📸 Image analysis for crop diseases
🎤 Voice input support

How can I assist you today?`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMessage]);
  };

  // Azure TTS logic (like expert-sug.js)
  let currentAudioRef = useRef(null);

  const playAzureTTS = async (text, lang = 'en-US') => {
    try {
      if (currentAudioRef.current && !currentAudioRef.current.paused) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
        return;
      }
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang })
      });
      if (!response.ok) throw new Error('TTS failed');
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      audio.play();
      audio.onended = () => {
        currentAudioRef.current = null;
      };
    } catch (e) {
      alert('Could not play voice output.');
    }
  };

  const speakText = (text) => {
    let lang = 'en-US';
    if (currentLanguage === 'ta') lang = 'ta-IN';
    playAzureTTS(text, lang);
  };

  // ----------------------
  // QUICK ADVICE HANDLER
  // ----------------------
  const getQuickAdvice = async (topic) => {
    let prompt = "";
    switch (topic) {
      case 'weather':
        prompt = "Give the latest practical weather-related farming tips for Tamil Nadu farmers. Focus on current (August) climate conditions and actionable advice.";
        break;
      case 'crops':
        prompt = "Provide key crop cultivation tips for the current season (August) in Tamil Nadu, including what to sow and best practices.";
        break;
      case 'pests':
        prompt = "What are the most common pest problems this month (August) in Tamil Nadu? Give practical control strategies and advice for local farmers.";
        break;
      case 'schemes':
        prompt = "List the ongoing major government schemes or subsidies available to Tamil Nadu farmers right now, with brief practical descriptions.";
        break;
      default:
        prompt = "Give general agricultural advice for Tamil Nadu farmers.";
    }

    setIsLoading(true);
    // Add typing message
    const typingMessage = {
      id: Date.now() + 1,
      content: 'Thinking...',
      sender: 'bot',
      isTyping: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const isTamil = currentLanguage === 'ta';
      if (isTamil) prompt = prompt + " Answer in Tamil.";
      const response = await callGeminiAPI(prompt);
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      const botMessage = {
        id: Date.now() + 2,
        content: response,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        content: 'Sorry, something went wrong fetching quick advice.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle message sending
  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedImage) return;

    let userMessageContent = inputValue;
    if (selectedImage && !inputValue) {
      userMessageContent = 'Please analyze this crop image and provide detailed farming advice';
    }

    const userMessage = {
      id: Date.now(),
      content: userMessageContent,
      sender: 'user',
      image: selectedImage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Store selectedImage before clearing it
    const imageToAnalyze = selectedImage;
    setSelectedImage(null);

    // Add typing indicator
    const typingMessage = {
      id: Date.now() + 1,
      content: 'Thinking...',
      sender: 'bot',
      isTyping: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Prepare request data
      const requestData = {
        sessionId: SESSION_ID,
        content: userMessageContent,
        language: currentLanguage
      };

      // Handle image analysis
      if (imageToAnalyze) {
        setIsProcessingImage(true);
        setMessages(prev => prev.map(msg =>
          msg.isTyping ? { ...msg, content: 'Analyzing image...' } : msg
        ));
        const base64Data = await convertImageToBase64(imageToAnalyze);
        requestData.imageData = base64Data;
        setMessages(prev => prev.map(msg =>
          msg.isTyping ? { ...msg, content: 'Processing with AI...' } : msg
        ));
        try {
          const isTamil = currentLanguage === 'ta' || (currentLanguage === 'auto' && /[\u0B80-\u0BFF]/.test(userMessageContent));
          const responseLanguage = isTamil ? 'Tamil' : 'English';
          const imagePrompt = `You are an expert agricultural consultant specializing in Tamil Nadu farming. 
Analyze this crop image and provide detailed, practical advice.

User Query: ${userMessageContent}

IMPORTANT: Please respond in ${responseLanguage} language only.

Please provide:
1. *Crop Identification*: What crop is this?
2. *Health Assessment*: Overall condition of the plant/crop
3. *Issues Detected*: Any diseases, pests, nutrient deficiencies, or problems
4. *Specific Diagnosis*: Detailed identification of any issues
5. *Treatment Recommendations*: Specific solutions with product names if possible
6. *Prevention Tips*: How to prevent similar issues
7. *Tamil Nadu Context*: Region-specific advice considering local conditions
8. *Next Steps*: Immediate actions the farmer should take

Make your response practical, actionable, and suitable for Tamil Nadu farmers.
If you detect any serious issues, prioritize those in your response.

${isTamil ? 'தமிழில் பதிலளிக்கவும். விவசாயிகளுக்கு பயனுள்ள விவரங்களை தமிழில் வழங்கவும்.' : 'Please respond in English with detailed agricultural advice.'}`;
          const botResponse = await callGeminiAPI(imagePrompt, base64Data);
          setMessages(prev => prev.filter(msg => !msg.isTyping));
          const botMessage = {
            id: Date.now() + 2,
            content: botResponse,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, botMessage]);
        } catch (error) {
          setMessages(prev => prev.filter(msg => !msg.isTyping));
          const errorMessage = {
            id: Date.now() + 2,
            content: 'Sorry, I encountered an error analyzing your image. Please try again or check your internet connection.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, errorMessage]);
        }
        setIsProcessingImage(false);
      } else {
        // Process text message with Gemini API
        try {
          const isTamil = currentLanguage === 'ta' || (currentLanguage === 'auto' && /[\u0B80-\u0BFF]/.test(userMessageContent));
          const responseLanguage = isTamil ? 'Tamil' : 'English';
          const textPrompt = `You are an expert agricultural consultant for Tamil Nadu farmers. 
User Query: ${userMessageContent}

IMPORTANT: Please respond in ${responseLanguage} language only.

Please provide helpful, practical advice about agriculture, farming, crops, diseases, weather, market prices, government schemes, or any other farming-related topics. 

Focus on:
- Tamil Nadu specific context and conditions
- Practical, actionable advice
- Local farming practices
- Current agricultural trends
- Government schemes and subsidies
- Market information
- Weather-based recommendations

Make your response informative, helpful, and suitable for Tamil Nadu farmers.

${isTamil ? 'தமிழில் பதிலளிக்கவும். விவசாயிகளுக்கு பயனுள்ள விவரங்களை தமிழில் வழங்கவும்.' : 'Please respond in English with detailed agricultural advice.'}`;
          const botResponse = await callGeminiAPI(textPrompt);
          setMessages(prev => prev.filter(msg => !msg.isTyping));
          const botMessage = {
            id: Date.now() + 2,
            content: botResponse,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, botMessage]);
        } catch (error) {
          setMessages(prev => prev.filter(msg => !msg.isTyping));
          const botMessage = {
            id: Date.now() + 2,
            content: 'Sorry, there was an error processing your request. Please try again.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, botMessage]);
        }
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      const errorMessage = {
        id: Date.now() + 2,
        content: 'Sorry, there was an error processing your request. Please try again.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsProcessingImage(false);
    }
  };

  // Helper function to convert image to base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const base64Data = e.target.result.split(',')[1];
          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB.');
        return;
      }
      setSelectedImage(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleLanguage = () => {
    const languages = ['auto', 'en', 'ta'];
    const currentIndex = languages.indexOf(currentLanguage);
    setCurrentLanguage(languages[(currentIndex + 1) % languages.length]);
  };

  const getLanguageText = () => {
    switch (currentLanguage) {
      case 'auto': return 'AUTO';
      case 'en': return 'EN';
      case 'ta': return 'தமிழ்';
      default: return 'AUTO';
    }
  };

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = currentLanguage === 'ta' ? 'ta-IN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => setInputValue(event.results[0][0].transcript);
    recognition.onerror = (event) => {
      alert('Error during speech recognition: ' + event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      addWelcomeMessage();
    }
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-header">
        <div className="header-left">
          <div className="bot-avatar">
            <span className="bot-icon">🌾</span>
          </div>
          <div className="bot-info">
            <h3>Agriculture Expert</h3>
            <p>Tamil Nadu Farming Specialist</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="language-toggle" onClick={toggleLanguage}>
            <i className="fas fa-globe"></i>
            <span>{getLanguageText()}</span>
          </button>
          <button className="clear-btn" onClick={clearChat} title="Clear Chat">
            <i className="fas fa-trash"></i>
          </button>
          <button className="close-btn" onClick={() => window.history.back()}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div className="quick-actions">
        <button className="action-btn" onClick={() => getQuickAdvice('weather')}>
          🌡️ Weather Tips
        </button>
        <button className="action-btn" onClick={() => getQuickAdvice('crops')}>
          🌾 Crop Tips
        </button>
        <button className="action-btn" onClick={() => getQuickAdvice('pests')}>
          🐛 Pest Control
        </button>
        <button className="action-btn" onClick={() => getQuickAdvice('schemes')}>
          🏛️ Schemes
        </button>
      </div>

      <div className="chatbot-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.sender}-message`}>
            <div className="message-avatar">
              <i className={`fas fa-${message.sender === 'user' ? 'user' : 'robot'}`}></i>
            </div>
            <div className="message-content">
              {message.image && (
                <div className="message-image">
                  <img
                    src={URL.createObjectURL(message.image)}
                    alt="Uploaded"
                    className="uploaded-image"
                  />
                </div>
              )}
              <div className="message-text">
                {message.isTyping ? (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  <>
                    <div dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br>')
                        .replace(/(\d+\.)/g, '<br>$1')
                        .replace(/🌾 \*\*Crop Identification\*\*/gi, '🌾 <strong>Crop Identification</strong>')
                        .replace(/🩺 \*\*Health Assessment\*\*/gi, '🩺 <strong>Health Assessment</strong>')
                        .replace(/⚠️ \*\*Issues Detected\*\*/gi, '⚠️ <strong>Issues Detected</strong>')
                        .replace(/💊 \*\*Treatment Recommendations\*\*/gi, '💊 <strong>Treatment Recommendations</strong>')
                        .replace(/🛡️ \*\*Prevention Tips\*\*/gi, '🛡️ <strong>Prevention Tips</strong>')
                        .replace(/▶️ \*\*Next Steps\*\*/gi, '▶️ <strong>Next Steps</strong>')
                    }} />
                    {message.sender === 'bot' && (
                      <button
                        className="speak-btn"
                        onClick={() => speakText(message.content)}
                        title="Speak"
                      >
                        <i className="fas fa-volume-up"></i>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="message-time">{message.timestamp}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        {selectedImage && (
          <div className="selected-image">
            <img src={URL.createObjectURL(selectedImage)} alt="Selected" />
            <button onClick={removeImage} className="remove-image">×</button>
            {isProcessingImage && (
              <div className="image-processing-indicator">
                <div className="processing-spinner"></div>
                <span>Processing image...</span>
              </div>
            )}
          </div>
        )}

        <div className="input-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="upload-btn"
            title="Upload Image"
          >
            <i className="fas fa-camera"></i>
          </button>

          <button
            onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
            className={`voice-btn ${isRecording ? 'recording' : ''}`}
            title="Voice Input"
          >
            <i className={`fas fa-${isRecording ? 'stop' : 'microphone'}`}></i>
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={currentLanguage === 'ta' ? 'பயிர்கள், நோய்கள், விவசாயம் பற்றி கேளுங்கள்...' : 'Ask about crops, diseases, farming...'}
            className="message-input"
          />

          <button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !selectedImage) || isLoading || isProcessingImage}
            className="send-btn"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgriChatbot;
