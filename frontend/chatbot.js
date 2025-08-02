// Gemini Chatbot Integration for Agri Website
// This script creates a floating chatbot widget at the bottom right
// The Gemini API key must be provided by the user and set in window.GEMINI_API_KEY

(function () {
  const chatbotButton = document.createElement("div");
  chatbotButton.id = "agri-chatbot-button";
  chatbotButton.innerHTML = `<i class="fas fa-comments" style="font-size:32px;color:#388e3c;"></i>`;
  chatbotButton.style.position = "fixed";
  chatbotButton.style.bottom = "24px";
  chatbotButton.style.right = "24px";
  chatbotButton.style.zIndex = "9999";
  chatbotButton.style.cursor = "pointer";
  chatbotButton.style.background = "#fff";
  chatbotButton.style.borderRadius = "50%";
  chatbotButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  chatbotButton.style.padding = "8px";

  const chatbotWindow = document.createElement("div");
  chatbotWindow.id = "agri-chatbot-window";
  chatbotWindow.style.position = "fixed";
  chatbotWindow.style.bottom = "80px";
  chatbotWindow.style.right = "24px";
  chatbotWindow.style.width = "320px";
  chatbotWindow.style.maxHeight = "420px";
  chatbotWindow.style.background = "#f9f9f9";
  chatbotWindow.style.borderRadius = "12px";
  chatbotWindow.style.boxShadow = "0 4px 24px rgba(0,0,0,0.18)";
  chatbotWindow.style.display = "none";
  chatbotWindow.style.flexDirection = "column";
  chatbotWindow.style.overflow = "hidden";
  chatbotWindow.style.zIndex = "10000";

  const chatbotHeader = document.createElement("div");
  chatbotHeader.style.background = "#388e3c";
  chatbotHeader.style.color = "#fff";
  chatbotHeader.style.padding = "12px";
  chatbotHeader.style.fontWeight = "bold";
  chatbotHeader.innerText = "Agri Chatbot";

  const chatbotMessages = document.createElement("div");
  chatbotMessages.id = "agri-chatbot-messages";
  chatbotMessages.style.flex = "1";
  chatbotMessages.style.padding = "12px";
  chatbotMessages.style.overflowY = "auto";
  chatbotMessages.style.fontSize = "15px";

  const chatbotInputArea = document.createElement("div");
  chatbotInputArea.style.display = "flex";
  chatbotInputArea.style.borderTop = "1px solid #e0e0e0";
  chatbotInputArea.style.background = "#fff";
  chatbotInputArea.style.padding = "8px";

  const chatbotInput = document.createElement("input");
  chatbotInput.type = "text";
  chatbotInput.placeholder = "Ask about agriculture...";
  chatbotInput.style.flex = "1";
  chatbotInput.style.border = "none";
  chatbotInput.style.outline = "none";
  chatbotInput.style.fontSize = "15px";
  chatbotInput.style.padding = "6px";
  chatbotInputArea.appendChild(chatbotInput);

  const chatbotSend = document.createElement("button");
  chatbotSend.innerText = "Send";
  chatbotSend.style.marginLeft = "8px";
  chatbotSend.style.background = "#388e3c";
  chatbotSend.style.color = "#fff";
  chatbotSend.style.border = "none";
  chatbotSend.style.borderRadius = "5px";
  chatbotSend.style.padding = "6px 14px";
  chatbotSend.style.cursor = "pointer";
  chatbotSend.style.fontWeight = "bold";
  chatbotInputArea.appendChild(chatbotSend);

  chatbotWindow.appendChild(chatbotHeader);
  chatbotWindow.appendChild(chatbotMessages);
  chatbotWindow.appendChild(chatbotInputArea);
  document.body.appendChild(chatbotButton);
  document.body.appendChild(chatbotWindow);

  chatbotButton.addEventListener("click", () => {
    chatbotWindow.style.display =
      chatbotWindow.style.display === "none" ? "flex" : "none";
  });

  function appendMessage(text, sender) {
    const msg = document.createElement("div");
    msg.style.margin = "8px 0";
    msg.style.textAlign = sender === "user" ? "right" : "left";
    msg.innerHTML = `<span style="background:${
      sender === "user" ? "#e8f5e9" : "#fff"
    };padding:6px 12px;border-radius:8px;display:inline-block;max-width:80%;">${text}</span>`;
    chatbotMessages.appendChild(msg);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  async function sendToGemini(prompt) {
    appendMessage(prompt, "user");
    appendMessage("Thinking...", "bot");

    // Greeting detection
    const greetings = ["hello", "hi", "hey", "hai"];
    const endNotes = ["thank you", "thanks", "ok", "okay", "bye", "goodbye"];  
    const promptLower = prompt.trim().toLowerCase();
    if (greetings.some(greet => promptLower === greet || promptLower.startsWith(greet + " ") || promptLower.endsWith(" " + greet))) {
      chatbotMessages.lastChild.remove();
      appendMessage("Hello! How can I help you with agriculture today?", "bot");
      return;
    }
    if (endNotes.some(end => promptLower === end || promptLower.startsWith(end + " ") || promptLower.endsWith(" " + end))) {
      chatbotMessages.lastChild.remove();
      appendMessage("You're welcome! If you have more agriculture questions, feel free to ask. Have a great day!", "bot");
      return;
    }

    try {
      const systemPrompt = "You are an expert agriculture assistant for Tamil Nadu. First, determine if the user's question is about agriculture (including farming, crops, livestock, agri-business, weather, soil, etc.). If it is, answer with a short, crisp, expert-like response. If it is NOT about agriculture, politely reply: 'Sorry, I can only answer agriculture-related questions.'";
      const apiKey = 'your -api-key'
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
      chatbotMessages.lastChild.remove(); // remove "Thinking..."
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Sorry, I couldn't get a valid response.";
      appendMessage(text, "bot");
    } catch (err) {
      chatbotMessages.lastChild.remove();
      appendMessage("Error: " + err.message, "bot");
    }
  }

  chatbotSend.addEventListener("click", () => {
    const prompt = chatbotInput.value.trim();
    if (!prompt) return;
    chatbotInput.value = "";
    sendToGemini(prompt);
  });

  chatbotInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      chatbotSend.click();
    }
  });

  appendMessage(
    "Hi! I am your Agri Chatbot. Ask me any agriculture-related question about Tamil Nadu, crops, weather, or this website.",
    "bot"
  );
})();

