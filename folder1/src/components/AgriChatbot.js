import React, { useState, useRef, useEffect } from 'react';
import './AgriChatbot.css';
import backgroundImage from '../assets/paddy-field-bg.jpg';

const AgriChatbot = () => {
  // Apply background image as a style
  const backgroundStyle = {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  };
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('auto');
  const [isRecording, setIsRecording] = useState(false);
  // const [isVisible, setIsVisible] = useState(false); // Temporarily removed unused state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const API_BASE_URL = 'http://localhost:5000/api';
  // const SESSION_ID = 'chatbot_session_' + Date.now(); // Temporarily removed unused constant

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message on component mount
    if (messages.length === 0) {
      addWelcomeMessage();
    }
  }, [messages.length]); // Added messages.length as dependency

  useEffect(() => {

    // Load speech synthesis voices
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          const voices = speechSynthesis.getVoices();
          console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
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

  // Language detection utility, will be used in future implementation
  // const detectLanguage = (text) => {
  //   const tamilRegex = /[\u0B80-\u0BFF]/;
  //   return tamilRegex.test(text) ? 'ta' : 'en';
  // };

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
    setSelectedImage(null);
    setIsLoading(true);

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
      // Handle simple greetings and thanks
      const userLower = userMessageContent.toLowerCase().trim();
      const greetings = ["hello", "hi", "hey", "hai", "vanakkam", "வணக்கம்"];
      const endNotes = ["thank you", "thanks", "ok", "okay", "bye", "goodbye", "nandri", "நன்றி"];

      if (greetings.some(greet => userLower === greet || userLower.startsWith(greet + " ") || userLower.endsWith(" " + greet))) {
        setTimeout(() => {
          setMessages(prev => prev.filter(msg => !msg.isTyping));
          const botMessage = {
            id: Date.now() + 2,
            content: "Hello! How can I help you with agriculture today?",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, botMessage]);
          setIsLoading(false);
        }, 1000);
        return;
      }

      if (endNotes.some(end => userLower === end || userLower.startsWith(end + " ") || userLower.endsWith(" " + end))) {
        setTimeout(() => {
          setMessages(prev => prev.filter(msg => !msg.isTyping));
          const botMessage = {
            id: Date.now() + 2,
            content: "You're welcome! If you have more agriculture questions, feel free to ask. Have a great day!",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, botMessage]);
          setIsLoading(false);
        }, 1000);
        return;
      }

      // Call Gemini API
      const systemPrompt = "You are an expert agriculture assistant for Tamil Nadu. First, determine if the user's question is about agriculture (including farming, crops, livestock, agri-business, weather, soil, etc.). If it is, answer with a short, crisp, expert-like response. If it is NOT about agriculture, politely reply: 'Sorry, I can only answer agriculture-related questions.'";
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;


      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: systemPrompt + "\nUser: " + userMessageContent }] }
            ]
          }),
        }
      );

      const data = await response.json();
      const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't get a valid response.";

      // Remove typing indicator and add bot response
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      const botMessage = {
        id: Date.now() + 2,
        content: botResponse,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      const errorMessage = {
        id: Date.now() + 2,
        content: 'Sorry, there was an error connecting to the service.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      alert('Error during speech recognition: ' + event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const speakText = async (text, messageId) => {
    try {
      // If currently speaking this message, stop it
      if (isSpeaking && currentSpeakingId === messageId) {
        stopCurrentSpeech();
        return;
      }

      // If speaking another message, stop it first
      if (isSpeaking) {
        stopCurrentSpeech();
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Clean text - remove markdown and HTML
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, ' ')
        .trim();

      if (!cleanText) {
        console.error('No text to speak after cleaning');
        return;
      }

      // Detect Tamil text
      const tamilRegex = /[\u0B80-\u0BFF]/;
      const hasTamilChars = tamilRegex.test(cleanText);
      const isTamil = hasTamilChars || currentLanguage === 'ta';
      const lang = isTamil ? 'ta-IN' : 'en-US';

      console.log('Text to speak:', cleanText);
      console.log('Language detected:', lang);

      setIsSpeaking(true);
      setCurrentSpeakingId(messageId);

      // Use Azure TTS
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({ 
          text: cleanText, 
          language: lang 
        })
      });

      if (!response.ok) {
        throw new Error(`Azure TTS API failed with status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio blob');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);

      audio.onended = () => {
        cleanupAudio(audioUrl);
      };

      audio.onerror = (error) => {
        console.error('Audio playback failed:', error);
        cleanupAudio(audioUrl);
      };

      audio.oncanplaythrough = () => {
        console.log('Audio ready to play');
      };

      await audio.play();
      console.log('Azure TTS audio playing successfully');

    } catch (error) {
      console.error('Error in text-to-speech:', error);
      alert('Text-to-speech failed. Please try again.');
      resetSpeechState();
    }
  };

  const stopCurrentSpeech = () => {
    // Stop audio playback
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    // Stop speech synthesis
    speechSynthesis.cancel();
    resetSpeechState();
  };

  const cleanupAudio = (audioUrl) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        setCurrentAudio(null);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      console.error('Error during audio cleanup:', error);
    }
    resetSpeechState();
  };

  const resetSpeechState = () => {
    setIsSpeaking(false);
    setCurrentSpeakingId(null);
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      addWelcomeMessage();
    }
  };

  const getQuickAdvice = async (category) => {
    setIsLoading(true);
    const typingMessage = {
      id: Date.now(),
      content: 'Getting advice...',
      sender: 'bot',
      isTyping: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const advicePrompts = {
        weather: "Provide current weather-based farming advice for Tamil Nadu",
        crops: "Give general crop cultivation tips for Tamil Nadu farmers",
        pests: "Provide common pest management advice for Tamil Nadu crops",
        schemes: "List important government schemes for Tamil Nadu farmers"
      };

      const prompt = advicePrompts[category] || "Give general farming advice";
      const systemPrompt = "You are an expert agriculture assistant for Tamil Nadu. Provide short, practical advice.";
      const apiKey = "AIzaSyDThNYvkIr1X0cwjMKtkIO5tXRsxxVAAN4";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: systemPrompt + "\nUser: " + prompt }] }
            ]
          }),
        }
      );

      const data = await response.json();
      const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't get advice right now.";

      setMessages(prev => prev.filter(msg => !msg.isTyping));
      const botMessage = {
        id: Date.now() + 1,
        content: botResponse,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error getting advice:', error);
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      const errorMessage = {
        id: Date.now() + 1,
        content: 'Sorry, there was an error getting advice.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-page" style={backgroundStyle}>
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
                        className={`speak-btn ${isSpeaking && currentSpeakingId === message.id ? 'speaking' : ''}`}
                        onClick={() => speakText(message.content, message.id)}
                        title={isSpeaking && currentSpeakingId === message.id ? "Stop Speaking" : "Speak"}
                      >
                        <i className={`fas fa-${isSpeaking && currentSpeakingId === message.id ? 'stop' : 'volume-up'}`}></i>
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
            disabled={(!inputValue.trim() && !selectedImage) || isLoading}
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