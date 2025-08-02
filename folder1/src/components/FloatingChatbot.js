import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import "./FloatingChatbot.css";

const LANG_LABELS = {
  en: "EN",
  ta: "தமிழ்",
};

const FloatingChatbot = () => {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getWelcomeMsg = (lng) =>
    lng === "en"
      ? "Hi! I am your Agri Chatbot. Ask me any agriculture-related question about Tamil Nadu, crops, weather, or this website."
      : "வணக்கம்! நான் உங்கள் விவசாய சாட்போட். தமிழ்நாடு, பயிர்கள், வானிலை அல்லது இந்த வலைத்தளம் பற்றிய எந்த விவசாய தொடர்பான கேள்வியையும் கேளுங்கள்.";

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: getWelcomeMsg(lang),
      sender: "bot",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Reset chatbot when language changes
  useEffect(() => {
    setMessages([
      {
        id: Date.now(),
        text: getWelcomeMsg(lang),
        sender: "bot",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setInputMessage("");
  }, [lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const appendMessage = (text, sender) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        sender,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const sendToGemini = async (prompt) => {
    appendMessage(prompt, "user");
    setInputMessage("");
    setIsLoading(true);

    const greetings = ["hello", "hi", "hey", "hai"];
    const endNotes = ["thank you", "thanks", "ok", "okay", "bye", "goodbye"];
    const lowerPrompt = prompt.trim().toLowerCase();

    // Greeting detection
    if (
      greetings.some(
        (greet) =>
          lowerPrompt === greet ||
          lowerPrompt.startsWith(greet + " ") ||
          lowerPrompt.endsWith(" " + greet)
      )
    ) {
      setIsLoading(false);
      appendMessage(
        lang === "en"
          ? "Hello! How can I help you with agriculture today?"
          : "வணக்கம்! இன்று விவசாயத்தில் நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "bot"
      );
      return;
    }

    // Farewell detection
    if (
      endNotes.some(
        (end) =>
          lowerPrompt === end ||
          lowerPrompt.startsWith(end + " ") ||
          lowerPrompt.endsWith(" " + end)
      )
    ) {
      setIsLoading(false);
      appendMessage(
        lang === "en"
          ? "You're welcome! If you have more agriculture questions, feel free to ask. Have a great day!"
          : "நல்வரவு! உங்களுக்கு மேலும் விவசாயக் கேள்விகள் இருந்தால், தயங்காமல் கேளுங்கள். நல்ல நாள்!",
        "bot"
      );
      return;
    }

    try {
      const systemPrompt = `You are an expert agriculture assistant for Tamil Nadu. First, determine if the user's question is about agriculture (including farming, crops, livestock, agri-business, weather, soil, etc.). If it is, answer with a short, crisp, expert-like response in ${
        lang === "en" ? "English" : "Tamil"
      }. If it is NOT about agriculture, politely reply: '${
        lang === "en"
          ? "Sorry, I can only answer agriculture-related questions."
          : "மன்னிக்கவும், என்னால் விவசாயம் தொடர்பான கேள்விகளுக்கு மட்டுமே பதிலளிக்க முடியும்."
      }'.`;

      const apiKey =
        process.env.REACT_APP_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\nUser: " + prompt }] }],
          }),
        }
      );

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        (lang === "en"
          ? "Sorry, I couldn't get a valid response."
          : "மன்னிக்கவும், என்னால் சரியான பதில் கிடைக்கவில்லை.");
      appendMessage(text, "bot");
    } catch (err) {
      appendMessage(
        lang === "en" ? "Error: " + err.message : "பிழை: " + err.message,
        "bot"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    sendToGemini(inputMessage.trim());
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Language switch button inside chatbot window
  const renderLanguageSwitcher = () => (
    <button
      className="lang-switch-btn"
      onClick={() => setLang(lang === "en" ? "ta" : "en")}
      title={lang === "en" ? "Switch to Tamil" : "Switch to English"}
    >
      {lang === "en" ? "தமிழ்" : "EN"}
    </button>
  );

  return (
    <>
      <div
        id="agri-chatbot-button"
        className="chatbot-toggle-button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={lang === "en" ? "Open Chatbot" : "சாட்போட்டை திறக்கவும்"}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (["Enter", " "].includes(e.key)) setIsOpen((v) => !v);
        }}
      >
        <i className="fas fa-comments" aria-hidden="true"></i>
      </div>

      {isOpen && (
        <div
          id="agri-chatbot-window"
          className="chatbot-window"
          role="dialog"
          aria-modal="true"
          aria-label={lang === "en" ? "Agri Chatbot Window" : "விவசாய சாட்போட் வலம்"}
        >
          <div className="chatbot-header">
            <span>{lang === "en" ? "Agri Chatbot" : "விவசாய சாட்போட்"}</span>
            <div className="chatbot-header-actions">
              {renderLanguageSwitcher()}
              <button
                aria-label={lang === "en" ? "Close Chatbot" : "சாட்போட்டை மூடு"}
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
          </div>
          <div id="agri-chatbot-messages" className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id}
                className={`message ${msg.sender === "user" ? "user-message" : "bot-message"}`}
                aria-live={msg.sender === "bot" ? "polite" : undefined}
              >
                <span className="message-bubble">{msg.text}</span>
              </div>
            ))}
            {isLoading && (
              <div className="message bot-message">
                <span className="message-bubble">
                  {lang === "en" ? "Thinking..." : "யோசித்துக்கொண்டிருக்கிறது..."}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="chatbot-input-area">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={lang === "en" ? "Ask about agriculture..." : "விவசாயம் பற்றி கேளுங்கள்..."}
              disabled={isLoading}
              aria-label={lang === "en" ? "Type your message" : "உங்கள் செய்தியை تایப் செய்யவும்"}
              autoFocus
            />
            <button type="submit" disabled={isLoading || !inputMessage.trim()}>
              {lang === "en" ? "Send" : "அனுப்பு"}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingChatbot;
