class SpeechToText {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.transcript = '';
    
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.output = document.getElementById('output');
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    this.languageSelect = document.getElementById('languageSelect');
    this.history = [];
    this.historyContainer = document.getElementById('history');
    this.searchInput = document.getElementById('languageSearch');
    this.copyCurrentBtn = document.getElementById('copyCurrentBtn');
    this.themeToggle = document.getElementById('themeToggle');
    
    this.initializeSpeechRecognition();
    this.bindEvents();
    this.setupLanguageSearch();
    this.initializeTheme();
    this.initializeProfilePic();
  }

  initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.languageSelect.value;
      
      this.recognition.onresult = (event) => this.handleResult(event);
      this.recognition.onerror = (event) => this.handleError(event);
      this.recognition.onend = () => this.handleEnd();
    } else {
      this.startBtn.disabled = true;
      this.statusText.textContent = 'Speech recognition not supported in this browser';
    }
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startRecording());
    this.stopBtn.addEventListener('click', () => this.stopRecording());
    this.languageSelect.addEventListener('change', () => this.handleLanguageChange());
    this.copyCurrentBtn.addEventListener('click', () => this.copyCurrentTranscript());
  }

  handleLanguageChange() {
    // If currently recording, stop and restart with new language
    const wasRecording = this.isRecording;
    if (wasRecording) {
      this.stopRecording();
    }
    
    // Update recognition language
    this.recognition.lang = this.languageSelect.value;
    
    // Restart recording if it was recording before
    if (wasRecording) {
      this.startRecording();
    }
  }

  startRecording() {
    this.isRecording = true;
    this.recognition.lang = this.languageSelect.value; // Ensure current language is set
    this.recognition.start();
    this.updateUI(true);
  }

  stopRecording() {
    this.isRecording = false;
    this.recognition.stop();
    this.updateUI(false);
  }

  handleResult(event) {
    let interimTranscript = '';
    let finalTranscript = '';
    
    // Track timing between speech segments for pause detection
    const pauseThreshold = 700; // milliseconds
    let lastWordTime = Date.now();
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      
      // Process the transcript to add punctuation
      let processedTranscript = this.addPunctuation(transcript, result);
      
      if (result.isFinal) {
        // Check for pause between segments
        const currentTime = Date.now();
        const timeDiff = currentTime - lastWordTime;
        
        // Add period if there's a significant pause
        if (timeDiff > pauseThreshold && !processedTranscript.match(/[.!?]$/)) {
          processedTranscript += '. ';
        }
        
        finalTranscript += processedTranscript;
        lastWordTime = currentTime;
        
        // Add to history when we get a final result
        this.addToHistory(processedTranscript);
      } else {
        interimTranscript += processedTranscript;
      }
    }

    this.transcript = finalTranscript || interimTranscript;
    this.output.textContent = this.transcript;
  }

  addPunctuation(transcript, result) {
    let processedText = transcript.trim();
    
    // Capitalize first letter of sentences
    processedText = processedText.replace(/^[a-z]|\. [a-z]/g, letter => letter.toUpperCase());
    
    // Add question mark for questions
    if (this.isQuestion(processedText)) {
      processedText = processedText.replace(/[.!?]*$/, '?');
    }
    // Add period if not already ending with punctuation
    else if (!processedText.match(/[.!?]$/)) {
      // Check confidence and prosody features if available
      const confidence = result[0].confidence;
      
      if (confidence > 0.8) {
        // Higher confidence usually indicates end of statement
        processedText += '.';
      } else {
        // Lower confidence might indicate continuing thought
        processedText += ' ';
      }
    }
    
    return processedText;
  }

  isQuestion(text) {
    // Common question words and patterns
    const questionWords = /^(what|who|where|when|why|how|is|are|can|could|would|will|do|does|did|should|may|might)/i;
    const questionStructure = /^(are|is|can|could|would|will|do|does|did|should|may|might) (you|we|they|it|he|she|the|this|that)/i;
    
    return (
      questionWords.test(text) ||
      questionStructure.test(text) ||
      text.includes('?')
    );
  }

  addToHistory(text) {
    if (!text.trim()) return; // Don't add empty entries
    
    const timestamp = new Date().toLocaleTimeString();
    const selectedLanguage = this.languageSelect.options[this.languageSelect.selectedIndex].text;
    
    const historyEntry = {
      text,
      timestamp,
      language: selectedLanguage
    };
    
    this.history.push(historyEntry);
    this.updateHistoryDisplay();
    
    // Save to localStorage
    localStorage.setItem('speechHistory', JSON.stringify(this.history));
  }

  updateHistoryDisplay() {
    this.historyContainer.innerHTML = this.history
      .map((entry, index) => `
        <div class="history-entry">
          <div class="history-header">
            <span class="history-timestamp">${entry.timestamp}</span>
            <span class="history-language">${entry.language}</span>
            <div class="history-actions">
              <button class="action-btn copy-btn" onclick="speechToText.copyHistoryEntry(${index})">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                </svg>
              </button>
              <button class="action-btn delete-btn" onclick="speechToText.deleteHistoryEntry(${index})">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="history-text">${entry.text}</div>
        </div>
      `)
      .reverse()
      .join('');
  }

  deleteHistoryEntry(index) {
    this.history.splice(index, 1);
    this.updateHistoryDisplay();
    localStorage.setItem('speechHistory', JSON.stringify(this.history));
  }

  loadHistory() {
    const savedHistory = localStorage.getItem('speechHistory');
    if (savedHistory) {
      this.history = JSON.parse(savedHistory);
      this.updateHistoryDisplay();
    }
  }

  setupLanguageSearch() {
    this.searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const options = this.languageSelect.options;
      
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const text = option.text.toLowerCase();
        
        if (text.includes(searchTerm)) {
          option.classList.remove('hidden');
        } else {
          option.classList.add('hidden');
        }
      }
      
      // If no visible options match the current value, select the first visible option
      const visibleOptions = Array.from(options).filter(opt => !opt.classList.contains('hidden'));
      if (visibleOptions.length > 0 && !visibleOptions.some(opt => opt.value === this.languageSelect.value)) {
        this.languageSelect.value = visibleOptions[0].value;
        this.handleLanguageChange();
      }
    });
  }

  copyCurrentTranscript() {
    const textToCopy = this.output.textContent.trim();
    if (!textToCopy) return;
    
    try {
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.showCopyFeedback(this.copyCurrentBtn);
      });
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }

  copyHistoryEntry(index) {
    const entry = this.history[index];
    if (!entry) return;
    
    try {
      navigator.clipboard.writeText(entry.text).then(() => {
        const copyBtn = document.querySelector(`.history-entry:nth-child(${this.history.length - index}) .copy-btn`);
        this.showCopyFeedback(copyBtn);
      });
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }

  showCopyFeedback(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
      </svg>
    `;
    button.classList.add('copied');
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('copied');
    }, 2000);
  }

  initializeTheme() {
    // Check for saved theme preference or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeToggleIcon(savedTheme);

    // Bind theme toggle event
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeToggleIcon(newTheme);
  }

  updateThemeToggleIcon(theme) {
    // Remove this method as we're now using CSS animations
    // The SVG stays the same and transforms based on theme
  }

  initializeProfilePic() {
    const profilePicWrapper = document.querySelector('.profile-pic-wrapper');
    if (!profilePicWrapper) return;

    profilePicWrapper.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const profilePic = document.querySelector('.profile-pic');
            // Remove placeholder SVG if it exists
            profilePic.innerHTML = '';
            // Create and add the image
            const img = document.createElement('img');
            img.src = e.target.result;
            profilePic.appendChild(img);
            
            // Save to localStorage
            localStorage.setItem('profilePicture', e.target.result);
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    });

    // Load saved profile picture on page load
    const savedProfilePic = localStorage.getItem('profilePicture');
    if (savedProfilePic) {
      const profilePic = document.querySelector('.profile-pic');
      profilePic.innerHTML = `<img src="${savedProfilePic}">`;
    }
  }

  handleError(event) {
    console.error('Speech recognition error:', event.error);
    this.statusText.textContent = `Error: ${event.error}`;
    this.stopRecording();
  }

  handleEnd() {
    if (this.isRecording) {
      this.recognition.start();
    }
  }

  updateUI(isRecording) {
    this.startBtn.disabled = isRecording;
    this.stopBtn.disabled = !isRecording;
    this.statusDot.classList.toggle('recording', isRecording);
    
    const selectedLanguage = this.languageSelect.options[this.languageSelect.selectedIndex].text;
    this.statusText.textContent = isRecording 
      ? `Recording in ${selectedLanguage}...` 
      : `Click 'Start Recording' to begin (${selectedLanguage})`;
  }

}

// Initialize the app
let speechToText;
document.addEventListener('DOMContentLoaded', () => {
  speechToText = new SpeechToText();
  speechToText.loadHistory();
});