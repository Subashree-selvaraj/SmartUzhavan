document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('upload-btn');
  const imageUpload = document.getElementById('image-upload');
  const fileNameEl = document.getElementById('file-name');
  const messagesContainer = document.getElementById('chat-messages');
  const langToggle = document.querySelector('.lang-toggle');
  let currentLang = 'en';

  const translations = {
    en: {
      welcome: 'Welcome! Please upload a photo of the affected crop leaf to get a diagnosis.',
      uploading: 'Uploading your image...',
      detecting: 'Detecting disease, please wait...',
      crop: 'Crop',
      disease: 'Disease',
      suggestion: 'Suggestion',
      noVideo: 'No relevant video found.',
      error: 'An error occurred. Please try again.'
    },
    ta: {
      welcome: 'வணக்கம்! நோயறிதலைப் பெற, பாதிக்கப்பட்ட பயிர் இலையின் புகைப்படத்தைப் பதிவேற்றவும்.',
      uploading: 'உங்கள் படம் பதிவேற்றப்படுகிறது...',
      detecting: 'நோய் கண்டறியப்படுகிறது, காத்திருக்கவும்...',
      crop: 'பயிர்',
      disease: 'நோய்',
      suggestion: 'பரிந்துரை',
      noVideo: 'தொடர்புடைய வீடியோ எதுவும் கிடைக்கவில்லை.',
      error: 'ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
    }
  };

  const API_BASE = window.API_BASE || `${window.location.origin}/api`;

  // --- Event Listeners ---
  uploadBtn.addEventListener('click', () => imageUpload.click());
  imageUpload.addEventListener('change', handleImageUpload);
  langToggle.addEventListener('click', handleLangToggle);

  function handleLangToggle(e) {
    if (e.target.tagName !== 'BUTTON') return;
    currentLang = e.target.dataset.lang;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
  }

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileNameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      appendMessage('user', `<img src="${e.target.result}" alt="Uploaded image" class="image-preview">`);
      sendImageToBackend(file);
    };
    reader.readAsDataURL(file);
  }

  async function sendImageToBackend(file) {
    appendMessage('bot', `<div class="typing-indicator"><span></span><span></span><span></span></div>`);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE}/predict?lang=${currentLang}`, {
        method: 'POST',
        body: formData,
      });
      
      messagesContainer.removeChild(messagesContainer.lastChild); // Remove typing

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || translations[currentLang].error);
      }

      const data = await response.json();
      displayPrediction(data);

    } catch (error) {
      appendMessage('bot', `<p>${error.message}</p>`);
    }
  }

  function displayPrediction(data) {
    const isTamil = currentLang === 'ta';
  
    let content = `
      <div class="prediction-result">
        <p><strong>${translations[currentLang].crop}:</strong> ${isTamil ? data.crop_ta || data.crop : data.crop}</p>
        <p><strong>${translations[currentLang].disease}:</strong> ${isTamil ? data.disease_ta || data.disease : data.disease}</p>
        ${data.confidence ? `<p><strong>${isTamil ? 'நம்பிக்கை' : 'Confidence'}:</strong> ${(data.confidence * 100).toFixed(2)}%</p>` : ''}

        ${data.expertAdvice ? `
          <div class="expert-advice">
            <h4>${isTamil ? 'நிபுணர் ஆலோசனை' : 'Expert Advice'}:</h4>
            <div class="markdown-advice">${marked.parse(data.expertAdvice)}</div>
          </div>
        ` : `
          <p><strong>${translations[currentLang].suggestion}:</strong> ${isTamil ? data.suggestion?.ta : data.suggestion?.en}</p>
        `}
        ${data.videoUrl ? `
          <div class="youtube-embed">
            <iframe src="${data.videoUrl}" allowfullscreen></iframe>
          </div>
        ` : `<p>${translations[currentLang].noVideo}</p>`}
      </div>
    `;
    appendMessage('bot', content);
  }
  

  function appendMessage(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function updateWelcomeText() {
  const firstMessage = document.querySelector('.chat-message.bot .message-content p');
  if (firstMessage) {
    firstMessage.textContent = translations[currentLang].welcome;
  }
}

// And call this after toggling lang
function handleLangToggle(e) {
  if (e.target.tagName !== 'BUTTON') return;
  currentLang = e.target.dataset.lang;
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');
  updateWelcomeText();
}

});
