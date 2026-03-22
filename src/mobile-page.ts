export function renderMobilePage(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#111111">
  <title>CCPhoto</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    body {
      background: #111;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      min-height: -webkit-fill-available;
      -webkit-tap-highlight-color: transparent;
      -webkit-text-size-adjust: 100%;
    }

    .app-title {
      position: absolute;
      top: 48px;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #555;
    }

    /* Mode toggle pill */
    .mode-toggle {
      position: absolute;
      top: 80px;
      display: flex;
      background: #222;
      border-radius: 24px;
      padding: 3px;
      gap: 0;
    }

    .mode-btn {
      padding: 8px 24px;
      border: none;
      border-radius: 21px;
      background: transparent;
      color: #888;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
      transition: background 0.2s, color 0.2s;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mode-btn.active {
      background: #2563eb;
      color: #fff;
    }

    .main {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    #file-input {
      display: none;
    }

    #take-photo-btn {
      width: 280px;
      height: 72px;
      border: none;
      border-radius: 16px;
      background: #2563eb;
      color: #fff;
      font-size: 20px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      min-height: 48px;
      touch-action: manipulation;
      -webkit-appearance: none;
      transition: background 0.15s ease;
    }

    #take-photo-btn:active {
      background: #1d4ed8;
    }

    .uploading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .uploading-text {
      font-size: 18px;
      font-weight: 600;
      color: #aaa;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #333;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .success {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .checkmark {
      font-size: 56px;
      line-height: 1;
      color: #22c55e;
    }

    .thumbnail {
      width: 120px;
      height: 120px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid #333;
    }

    .annotate-resend-btn {
      padding: 10px 24px;
      border: 1px solid #2563eb;
      border-radius: 12px;
      background: transparent;
      color: #60a5fa;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
      min-height: 48px;
    }

    .annotate-resend-btn:active {
      background: rgba(37, 99, 235, 0.15);
    }

    .error-msg {
      font-size: 16px;
      font-weight: 600;
      color: #ef4444;
      text-align: center;
      padding: 0 24px;
    }

    /* Status bar at bottom */
    .status-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 44px;
      background: #1a1a1a;
      border-top: 1px solid #333;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 50;
    }

    .photo-count {
      font-size: 14px;
      color: #555;
      font-weight: 500;
    }

    .photo-count.active {
      color: #888;
    }

    .history-btn {
      border: none;
      background: transparent;
      color: #60a5fa;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
      padding: 8px 12px;
      min-height: 48px;
      display: flex;
      align-items: center;
    }

    @keyframes pulse {
      0%, 100% { background: #2563eb; }
      50% { background: #60a5fa; }
    }

    #take-photo-btn.requesting {
      animation: pulse 1s ease-in-out infinite;
    }

    .request-notice {
      font-size: 16px;
      font-weight: 600;
      color: #60a5fa;
      margin-bottom: 8px;
    }

    /* Toast container */
    .toast-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 200;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 16px;
      gap: 8px;
      pointer-events: none;
    }

    .toast {
      width: 100%;
      max-width: 400px;
      background: rgba(30, 30, 30, 0.9);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 12px 40px 12px 16px;
      color: #fff;
      font-size: 14px;
      line-height: 1.5;
      pointer-events: auto;
      animation: toastSlideIn 0.3s ease-out;
      position: relative;
      word-wrap: break-word;
    }

    @keyframes toastSlideIn {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .toast-dismiss {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(255,255,255,0.15);
      color: #aaa;
      border-radius: 50%;
      font-size: 12px;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .toast-truncated {
      color: #60a5fa;
      font-size: 12px;
      margin-top: 4px;
      cursor: pointer;
    }

    .toast-image {
      width: 48px;
      height: 48px;
      border-radius: 6px;
      object-fit: cover;
      margin-top: 8px;
    }

    .toast .content-text h1 { font-size: 18px; margin: 4px 0; color: #fff; }
    .toast .content-text h2 { font-size: 16px; margin: 4px 0; color: #fff; }
    .toast .content-text h3 { font-size: 14px; margin: 2px 0; color: #fff; }
    .toast .content-text pre { background: #000; padding: 6px; border-radius: 4px; overflow-x: auto; margin: 4px 0; font-size: 12px; }
    .toast .content-text code { background: #000; padding: 1px 3px; border-radius: 2px; font-size: 12px; }
    .toast .content-text pre code { padding: 0; background: none; }
    .toast .content-text ul { padding-left: 16px; margin: 2px 0; }
    .toast .content-text strong { color: #fff; }

    /* History panel */
    .history-panel {
      position: fixed;
      inset: 0;
      z-index: 150;
      background: #111;
      display: flex;
      flex-direction: column;
    }

    .history-header {
      height: 56px;
      background: #1a1a1a;
      border-bottom: 1px solid #333;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      flex-shrink: 0;
    }

    .history-title {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }

    .history-close-btn {
      border: none;
      background: transparent;
      color: #60a5fa;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
      padding: 8px 12px;
      min-height: 48px;
      display: flex;
      align-items: center;
    }

    .history-body {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .history-empty {
      text-align: center;
      color: #555;
      padding: 48px 16px;
      font-size: 14px;
    }

    .content-message {
      padding: 12px 16px;
      border-bottom: 1px solid #222;
    }

    .content-label {
      font-size: 11px;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }

    .content-text {
      font-size: 14px;
      line-height: 1.5;
      color: #ddd;
      word-wrap: break-word;
    }

    .content-text h1 { font-size: 20px; margin: 8px 0; color: #fff; }
    .content-text h2 { font-size: 17px; margin: 6px 0; color: #fff; }
    .content-text h3 { font-size: 15px; margin: 4px 0; color: #fff; }
    .content-text pre { background: #000; padding: 8px; border-radius: 6px; overflow-x: auto; margin: 6px 0; }
    .content-text code { background: #000; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
    .content-text pre code { padding: 0; background: none; }
    .content-text ul { padding-left: 20px; margin: 4px 0; }
    .content-text strong { color: #fff; }

    .content-image {
      max-width: 100%;
      border-radius: 8px;
      margin-top: 8px;
    }

    /* Annotation overlay */
    .annotation-screen {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: #000;
      display: flex;
      flex-direction: column;
    }

    .annotation-canvas {
      flex: 1;
      touch-action: none;
      cursor: crosshair;
    }

    .annotation-toolbar {
      height: 60px;
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 12px;
      flex-shrink: 0;
    }

    .color-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #444;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
      padding: 0;
    }

    .color-btn.active {
      border-color: #fff;
      box-shadow: 0 0 0 2px #2563eb;
    }

    .size-btn, .tool-btn {
      height: 32px;
      padding: 0 10px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #222;
      color: #ddd;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
    }

    .tool-btn.primary {
      background: #2563eb;
      border-color: #2563eb;
      color: #fff;
      font-weight: 600;
    }

    .toolbar-sep {
      width: 1px;
      height: 24px;
      background: #333;
    }

    /* Live mode */
    .live-container {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .live-video {
      width: 100%;
      max-width: 640px;
      max-height: 60vh;
      object-fit: contain;
      border-radius: 12px;
      background: #000;
    }

    .live-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: #ef4444;
      color: #fff;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fff;
      animation: livePulse 1.5s ease-in-out infinite;
    }

    @keyframes livePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .streaming-indicator {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(0,0,0,0.6);
      color: #aaa;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .streaming-dots {
      display: inline-flex;
      gap: 3px;
    }

    .streaming-dots span {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #60a5fa;
      animation: streamDot 1.4s ease-in-out infinite;
    }

    .streaming-dots span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .streaming-dots span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes streamDot {
      0%, 80%, 100% { opacity: 0.3; }
      40% { opacity: 1; }
    }

    .live-status {
      font-size: 14px;
      color: #888;
    }

    .stop-btn {
      width: 200px;
      height: 48px;
      border: 2px solid #ef4444;
      border-radius: 12px;
      background: transparent;
      color: #ef4444;
      font-size: 16px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
      min-height: 48px;
    }

    .stop-btn:active {
      background: rgba(239, 68, 68, 0.15);
    }

    .voice-btn {
      position: fixed;
      bottom: 56px;
      right: 16px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: #333;
      color: #aaa;
      font-size: 24px;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-appearance: none;
      z-index: 120;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      transition: background 0.2s, transform 0.1s;
    }

    .voice-btn:active {
      transform: scale(0.95);
    }

    .voice-btn.listening {
      background: #ef4444;
      color: #fff;
      animation: voicePulse 1.2s ease-in-out infinite;
    }

    .voice-btn.processing {
      background: #f59e0b;
      color: #fff;
    }

    .voice-btn.hidden {
      display: none;
    }

    @keyframes voicePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
      50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
    }

    .voice-status {
      position: fixed;
      bottom: 120px;
      right: 16px;
      background: rgba(30, 30, 30, 0.9);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      border: 1px solid #333;
      border-radius: 8px;
      padding: 6px 12px;
      color: #ddd;
      font-size: 12px;
      z-index: 120;
      max-width: 200px;
      text-align: center;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="app-title">CCPhoto</div>

  <div class="mode-toggle">
    <button class="mode-btn active" id="mode-photo-btn" type="button">Photo</button>
    <button class="mode-btn" id="mode-live-btn" type="button">Live</button>
  </div>

  <!-- Photo view (default) -->
  <div class="main" id="photo-view">
    <div id="main-area">
      <button id="take-photo-btn" type="button">Take Photo</button>
    </div>
  </div>
  <input type="file" id="file-input" accept="image/*" capture="environment">

  <!-- Live view (hidden by default) -->
  <div class="main" id="live-view" style="display:none;">
    <div class="live-container" id="live-container">
      <video id="live-video" class="live-video" playsinline muted autoplay></video>
      <div class="live-badge"><div class="live-dot"></div> LIVE</div>
      <div class="streaming-indicator" id="streaming-indicator" style="display:none;">
        Streaming<div class="streaming-dots"><span></span><span></span><span></span></div>
      </div>
      <canvas id="frame-canvas" style="display:none;"></canvas>
    </div>
    <div class="live-status" id="live-status">Starting camera...</div>
    <button class="stop-btn" id="stop-btn" type="button">Stop Streaming</button>
  </div>

  <!-- Toast container -->
  <div class="toast-container" id="toast-container"></div>

  <button class="voice-btn hidden" id="voice-btn" type="button" aria-label="Voice message">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  </button>
  <div class="voice-status" id="voice-status" style="display:none;"></div>

  <!-- Status bar -->
  <div class="status-bar">
    <div class="photo-count" id="photo-count"></div>
    <button class="history-btn" id="history-btn" type="button">History</button>
  </div>

  <script>
    (function() {
      var token = ${JSON.stringify(token)};
      var origin = window.location.origin;
      var uploadUrl = origin + '/upload';
      var frameUrl = origin + '/frame';
      var evtUrl = origin + '/events';
      var photoCount = 0;
      var busy = false;
      var currentMode = 'photo';
      var liveStream = null;
      var frameInterval = null;
      var messageHistory = [];
      var autoResetTimer = null;
      var lastUploadedDataUrl = null;
      var lastUploadedFile = null;

      var mainArea = document.getElementById('main-area');
      var fileInput = document.getElementById('file-input');
      var photoCountEl = document.getElementById('photo-count');
      var photoView = document.getElementById('photo-view');
      var liveView = document.getElementById('live-view');
      var modePhotoBtn = document.getElementById('mode-photo-btn');
      var modeLiveBtn = document.getElementById('mode-live-btn');
      var toastContainer = document.getElementById('toast-container');
      var historyBtn = document.getElementById('history-btn');
      var stopBtn = document.getElementById('stop-btn');
      var liveVideo = document.getElementById('live-video');
      var frameCanvas = document.getElementById('frame-canvas');
      var frameCtx = frameCanvas.getContext('2d');
      var streamingIndicator = document.getElementById('streaming-indicator');
      var liveStatus = document.getElementById('live-status');

      // --- Mode toggle ---
      modePhotoBtn.addEventListener('click', function() {
        if (currentMode === 'photo') return;
        switchToPhoto();
      });

      modeLiveBtn.addEventListener('click', function() {
        if (currentMode === 'live') return;
        switchToLive();
      });

      function switchToPhoto() {
        currentMode = 'photo';
        modePhotoBtn.classList.add('active');
        modeLiveBtn.classList.remove('active');
        photoView.style.display = '';
        liveView.style.display = 'none';
        stopLiveStream();
      }

      function switchToLive() {
        currentMode = 'live';
        modeLiveBtn.classList.add('active');
        modePhotoBtn.classList.remove('active');
        photoView.style.display = 'none';
        liveView.style.display = '';
        startLiveStream();
        // Notify server so Claude knows user switched to live mode
        fetch(origin + '/mode-switch?token=' + encodeURIComponent(token), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_livestream' })
        }).catch(function() {});
      }

      // --- Photo mode ---
      function bindTakePhotoBtn() {
        var btn = document.getElementById('take-photo-btn');
        if (btn) {
          btn.addEventListener('click', function() {
            if (!busy) {
              clearRequestState();
              fileInput.value = '';
              fileInput.click();
            }
          });
        }
      }
      bindTakePhotoBtn();

      fileInput.addEventListener('change', function() {
        if (!fileInput.files || !fileInput.files[0]) return;
        if (busy) return;
        clearRequestState();
        var file = fileInput.files[0];

        // Read data URL for potential annotation later
        var reader = new FileReader();
        reader.onload = function() {
          lastUploadedDataUrl = reader.result;
          lastUploadedFile = file;
          uploadFile(file);
        };
        reader.readAsDataURL(file);
      });

      function clearRequestState() {
        var btn = document.getElementById('take-photo-btn');
        if (btn) {
          btn.classList.remove('requesting');
        }
        var notice = document.querySelector('.request-notice');
        if (notice && notice.parentNode) {
          notice.parentNode.removeChild(notice);
        }
      }

      function resetToButton() {
        busy = false;
        lastUploadedDataUrl = null;
        lastUploadedFile = null;
        if (autoResetTimer) {
          clearTimeout(autoResetTimer);
          autoResetTimer = null;
        }
        mainArea.innerHTML = '<button id="take-photo-btn" type="button">Take Photo</button>';
        bindTakePhotoBtn();
      }

      function updateCount() {
        if (photoCount === 0) {
          photoCountEl.textContent = '';
          photoCountEl.classList.remove('active');
        } else {
          photoCountEl.textContent = photoCount + (photoCount === 1 ? ' photo' : ' photos') + ' sent';
          photoCountEl.classList.add('active');
        }
      }

      function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
      }

      function renderBasicMarkdown(text) {
        var escaped = escapeHtml(text);
        var lines = escaped.split('\\n');
        var result = [];
        var inCode = false;
        var codeLines = [];

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.match(/^\\\`\\\`\\\`/)) {
            if (inCode) {
              result.push('<pre><code>' + codeLines.join('\\n') + '</code></pre>');
              codeLines = [];
              inCode = false;
            } else {
              inCode = true;
            }
            continue;
          }
          if (inCode) {
            codeLines.push(line);
            continue;
          }
          if (line.match(/^### /)) { result.push('<h3>' + line.slice(4) + '</h3>'); continue; }
          if (line.match(/^## /)) { result.push('<h2>' + line.slice(3) + '</h2>'); continue; }
          if (line.match(/^# /)) { result.push('<h1>' + line.slice(2) + '</h1>'); continue; }
          if (line.match(/^- /)) { result.push('<ul><li>' + line.slice(2) + '</li></ul>'); continue; }

          line = line.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
          line = line.replace(/\\\`([^\\\`]+)\\\`/g, '<code>$1</code>');
          result.push(line === '' ? '<br>' : line + '<br>');
        }
        if (inCode) {
          result.push('<pre><code>' + codeLines.join('\\n') + '</code></pre>');
        }
        return result.join('\\n');
      }

      // --- Upload ---
      function uploadFile(file) {
        busy = true;
        mainArea.innerHTML =
          '<div class="uploading">' +
            '<div class="spinner"></div>' +
            '<div class="uploading-text">Uploading...</div>' +
          '</div>';

        var thumbUrl = URL.createObjectURL(file);
        var formData = new FormData();
        formData.append('photo', file);

        var url = uploadUrl + '?token=' + encodeURIComponent(token);

        fetch(url, { method: 'POST', body: formData })
        .then(function(res) {
          if (!res.ok) throw new Error('Upload failed (' + res.status + ')');
          return res;
        })
        .then(function() {
          photoCount++;
          updateCount();
          mainArea.innerHTML =
            '<div class="success">' +
              '<div class="checkmark">&#10003;</div>' +
              '<img class="thumbnail" src="' + thumbUrl + '" alt="Uploaded photo">' +
              '<button class="annotate-resend-btn" id="annotate-resend-btn" type="button">Annotate &amp; Resend</button>' +
            '</div>';

          var annotateBtn = document.getElementById('annotate-resend-btn');
          annotateBtn.addEventListener('click', function() {
            if (autoResetTimer) {
              clearTimeout(autoResetTimer);
              autoResetTimer = null;
            }
            if (lastUploadedDataUrl && lastUploadedFile) {
              showAnnotationScreen(lastUploadedDataUrl, lastUploadedFile);
            }
          });

          autoResetTimer = setTimeout(function() {
            URL.revokeObjectURL(thumbUrl);
            resetToButton();
          }, 4000);
        })
        .catch(function(err) {
          URL.revokeObjectURL(thumbUrl);
          mainArea.innerHTML =
            '<div class="error-msg">' + escapeHtml(err.message || 'Upload failed') + '</div>';
          setTimeout(function() { resetToButton(); }, 3000);
        });
      }

      // --- Toast system ---
      var toastCount = 0;
      var MAX_TOASTS = 3;

      function showToast(data) {
        // Enforce max toasts
        while (toastContainer.children.length >= MAX_TOASTS) {
          toastContainer.removeChild(toastContainer.firstChild);
        }

        var toast = document.createElement('div');
        toast.className = 'toast';

        // Dismiss button
        var dismissBtn = document.createElement('button');
        dismissBtn.className = 'toast-dismiss';
        dismissBtn.textContent = 'X';
        dismissBtn.addEventListener('click', function() {
          removeToast(toast);
        });
        toast.appendChild(dismissBtn);

        if (data.text) {
          var textDiv = document.createElement('div');
          textDiv.className = 'content-text';
          var fullHtml = renderBasicMarkdown(data.text);
          if (data.text.length > 150) {
            var truncatedHtml = renderBasicMarkdown(data.text.substring(0, 150) + '...');
            textDiv.innerHTML = truncatedHtml;
            var expandHint = document.createElement('div');
            expandHint.className = 'toast-truncated';
            expandHint.textContent = 'tap to expand';
            toast.appendChild(textDiv);
            toast.appendChild(expandHint);
            var expanded = false;
            expandHint.addEventListener('click', function() {
              if (!expanded) {
                textDiv.innerHTML = fullHtml;
                expandHint.style.display = 'none';
                expanded = true;
              }
            });
          } else {
            textDiv.innerHTML = fullHtml;
            toast.appendChild(textDiv);
          }
        }

        if (data.imageData && data.mimeType) {
          var img = document.createElement('img');
          img.className = 'toast-image';
          img.src = 'data:' + data.mimeType + ';base64,' + data.imageData;
          img.alt = 'From Claude';
          toast.appendChild(img);
        }

        toastContainer.appendChild(toast);

        // Auto-dismiss after 6 seconds
        var dismissTimer = setTimeout(function() {
          removeToast(toast);
        }, 6000);

        toast._dismissTimer = dismissTimer;
      }

      function removeToast(toast) {
        if (toast._dismissTimer) clearTimeout(toast._dismissTimer);
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }

      // --- History panel ---
      function showHistoryPanel() {
        var panel = document.createElement('div');
        panel.className = 'history-panel';
        panel.id = 'history-panel';

        var header = document.createElement('div');
        header.className = 'history-header';

        var title = document.createElement('div');
        title.className = 'history-title';
        title.textContent = 'Message History';
        header.appendChild(title);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'history-close-btn';
        closeBtn.textContent = 'Close';
        closeBtn.type = 'button';
        closeBtn.addEventListener('click', function() {
          document.body.removeChild(panel);
        });
        header.appendChild(closeBtn);
        panel.appendChild(header);

        var body = document.createElement('div');
        body.className = 'history-body';

        if (messageHistory.length === 0) {
          var empty = document.createElement('div');
          empty.className = 'history-empty';
          empty.textContent = 'No messages yet';
          body.appendChild(empty);
        } else {
          for (var i = messageHistory.length - 1; i >= 0; i--) {
            var item = messageHistory[i];
            var msg = document.createElement('div');
            msg.className = 'content-message';

            var label = document.createElement('div');
            label.className = 'content-label';
            label.textContent = 'From Claude';
            msg.appendChild(label);

            if (item.text) {
              var textDiv = document.createElement('div');
              textDiv.className = 'content-text';
              textDiv.innerHTML = renderBasicMarkdown(item.text);
              msg.appendChild(textDiv);
            }

            if (item.imageData && item.mimeType) {
              var img = document.createElement('img');
              img.className = 'content-image';
              img.src = 'data:' + item.mimeType + ';base64,' + item.imageData;
              img.alt = 'From Claude';
              msg.appendChild(img);
            }

            body.appendChild(msg);
          }
        }

        panel.appendChild(body);
        document.body.appendChild(panel);
      }

      historyBtn.addEventListener('click', function() {
        var existing = document.getElementById('history-panel');
        if (existing) {
          document.body.removeChild(existing);
        } else {
          showHistoryPanel();
        }
      });

      // --- SSE ---
      var evtSource = new EventSource(evtUrl + '?token=' + encodeURIComponent(token));

      evtSource.addEventListener('photo-requested', function() {
        if (navigator.vibrate) navigator.vibrate(200);

        // Switch to photo mode if in live
        if (currentMode === 'live') {
          switchToPhoto();
        }

        var btn = document.getElementById('take-photo-btn');
        if (btn) {
          btn.classList.add('requesting');
          var existing = document.querySelector('.request-notice');
          if (!existing) {
            var notice = document.createElement('div');
            notice.className = 'request-notice';
            notice.textContent = 'Photo requested!';
            mainArea.insertBefore(notice, mainArea.firstChild);
          }
        }
      });

      evtSource.addEventListener('content-push', function(e) {
        var data = JSON.parse(e.data);

        if (navigator.vibrate) navigator.vibrate(100);

        // Store in history
        messageHistory.push(data);

        // Show toast
        showToast(data);

        // TTS: speak the message if requested
        if (data.speak && data.text && window.speechSynthesis) {
          speechSynthesis.cancel();
          setTimeout(function() {
            var utterance = new SpeechSynthesisUtterance(data.text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
          }, 50);
        }
      });

      evtSource.addEventListener('switch-to-live', function() {
        if (navigator.vibrate) navigator.vibrate(200);
        if (currentMode !== 'live') {
          switchToLive();
        }
      });

      // --- Live mode ---
      var FRAME_INTERVAL_MS = 3000;

      function startLiveStream() {
        liveStatus.style.color = '#888';
        streamingIndicator.style.display = 'none';

        if (!window.isSecureContext || !navigator.mediaDevices) {
          liveStatus.textContent = 'Live mode requires HTTPS. Say "start livestream" in Claude Code.';
          liveStatus.style.color = '#f59e0b';
          return;
        }

        liveStatus.textContent = 'Starting camera...';

        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        .then(function(stream) {
          liveStream = stream;
          liveVideo.srcObject = stream;
          liveStatus.textContent = 'Camera active -- streaming to Claude';

          liveVideo.onloadedmetadata = function() {
            frameCanvas.width = liveVideo.videoWidth;
            frameCanvas.height = liveVideo.videoHeight;
            startFrameCapture();
          };
        })
        .catch(function(err) {
          liveStatus.textContent = 'Camera access denied: ' + err.message;
          liveStatus.style.color = '#ef4444';
        });
      }

      function startFrameCapture() {
        streamingIndicator.style.display = '';

        frameInterval = setInterval(function() {
          if (liveVideo.readyState < 2) return;

          frameCtx.drawImage(liveVideo, 0, 0);
          frameCanvas.toBlob(function(blob) {
            if (!blob) return;

            var url = frameUrl + '?token=' + encodeURIComponent(token)
              + '&w=' + frameCanvas.width
              + '&h=' + frameCanvas.height;

            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'image/jpeg' },
              body: blob,
            })
            .then(function() {
              // streaming indicator handled by CSS animation
            })
            .catch(function() {
              // silent fail, indicator keeps animating
            });
          }, 'image/jpeg', 0.7);
        }, FRAME_INTERVAL_MS);
      }

      function stopLiveStream() {
        if (frameInterval) {
          clearInterval(frameInterval);
          frameInterval = null;
        }
        if (liveStream) {
          liveStream.getTracks().forEach(function(track) {
            track.stop();
          });
          liveStream = null;
          liveVideo.srcObject = null;
        }
        streamingIndicator.style.display = 'none';
        liveStatus.textContent = 'Starting camera...';
        liveStatus.style.color = '#888';
      }

      stopBtn.addEventListener('click', function() {
        switchToPhoto();
      });

      // --- Annotation screen (opt-in) ---
      var annotationOverlay = null;
      var annotationCanvas = null;
      var annotationCtx = null;
      var originalImage = null;
      var originalFile = null;
      var strokes = [];
      var currentStroke = null;
      var drawColor = '#ff0000';
      var drawWidth = 3;
      var dpr = window.devicePixelRatio || 1;

      function showAnnotationScreen(dataUrl, file) {
        originalFile = file;

        annotationOverlay = document.createElement('div');
        annotationOverlay.className = 'annotation-screen';

        annotationCanvas = document.createElement('canvas');
        annotationCanvas.className = 'annotation-canvas';
        annotationOverlay.appendChild(annotationCanvas);

        // Toolbar
        var toolbar = document.createElement('div');
        toolbar.className = 'annotation-toolbar';

        var colors = [
          { color: '#ff0000', label: 'Red' },
          { color: '#2563eb', label: 'Blue' },
          { color: '#22c55e', label: 'Green' },
          { color: '#ffffff', label: 'White' }
        ];

        colors.forEach(function(c) {
          var btn = document.createElement('button');
          btn.className = 'color-btn' + (c.color === drawColor ? ' active' : '');
          btn.style.background = c.color;
          btn.setAttribute('data-color', c.color);
          btn.type = 'button';
          btn.addEventListener('click', function() {
            drawColor = c.color;
            toolbar.querySelectorAll('.color-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
          });
          toolbar.appendChild(btn);
        });

        var sep1 = document.createElement('div');
        sep1.className = 'toolbar-sep';
        toolbar.appendChild(sep1);

        var sizeBtn = document.createElement('button');
        sizeBtn.className = 'size-btn';
        sizeBtn.textContent = 'Thin';
        sizeBtn.type = 'button';
        sizeBtn.addEventListener('click', function() {
          drawWidth = drawWidth === 3 ? 8 : 3;
          sizeBtn.textContent = drawWidth === 3 ? 'Thin' : 'Thick';
        });
        toolbar.appendChild(sizeBtn);

        var undoBtn = document.createElement('button');
        undoBtn.className = 'tool-btn';
        undoBtn.textContent = 'Undo';
        undoBtn.type = 'button';
        undoBtn.addEventListener('click', function() {
          if (strokes.length > 0) {
            strokes.pop();
            redrawCanvas();
          }
        });
        toolbar.appendChild(undoBtn);

        var clearBtn = document.createElement('button');
        clearBtn.className = 'tool-btn';
        clearBtn.textContent = 'Clear';
        clearBtn.type = 'button';
        clearBtn.addEventListener('click', function() {
          strokes = [];
          redrawCanvas();
        });
        toolbar.appendChild(clearBtn);

        var sep2 = document.createElement('div');
        sep2.className = 'toolbar-sep';
        toolbar.appendChild(sep2);

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'tool-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.type = 'button';
        cancelBtn.addEventListener('click', function() {
          closeAnnotation();
        });
        toolbar.appendChild(cancelBtn);

        var sendBtn = document.createElement('button');
        sendBtn.className = 'tool-btn primary';
        sendBtn.textContent = 'Send';
        sendBtn.type = 'button';
        sendBtn.addEventListener('click', function() {
          annotationCanvas.toBlob(function(blob) {
            var annotatedFile = new File([blob], 'annotated.jpg', { type: 'image/jpeg' });
            uploadFile(annotatedFile);
            closeAnnotation();
          }, 'image/jpeg', 0.92);
        });
        toolbar.appendChild(sendBtn);

        annotationOverlay.appendChild(toolbar);
        document.body.appendChild(annotationOverlay);

        // Load image onto canvas
        originalImage = new Image();
        originalImage.onload = function() {
          var cw = annotationOverlay.clientWidth;
          var ch = annotationOverlay.clientHeight - 60;
          annotationCanvas.style.width = cw + 'px';
          annotationCanvas.style.height = ch + 'px';
          annotationCanvas.width = cw * dpr;
          annotationCanvas.height = ch * dpr;
          annotationCtx = annotationCanvas.getContext('2d');
          annotationCtx.scale(dpr, dpr);
          strokes = [];
          redrawCanvas();
          setupDrawing();
        };
        originalImage.src = dataUrl;
      }

      function redrawCanvas() {
        var cw = annotationCanvas.width / dpr;
        var ch = annotationCanvas.height / dpr;
        annotationCtx.clearRect(0, 0, cw, ch);

        var scale = Math.min(cw / originalImage.width, ch / originalImage.height);
        var w = originalImage.width * scale;
        var h = originalImage.height * scale;
        var x = (cw - w) / 2;
        var y = (ch - h) / 2;
        annotationCtx.drawImage(originalImage, x, y, w, h);

        for (var i = 0; i < strokes.length; i++) {
          var s = strokes[i];
          annotationCtx.beginPath();
          annotationCtx.strokeStyle = s.color;
          annotationCtx.lineWidth = s.width;
          annotationCtx.lineCap = 'round';
          annotationCtx.lineJoin = 'round';
          for (var j = 0; j < s.points.length; j++) {
            if (j === 0) annotationCtx.moveTo(s.points[j].x, s.points[j].y);
            else annotationCtx.lineTo(s.points[j].x, s.points[j].y);
          }
          annotationCtx.stroke();
        }
      }

      function setupDrawing() {
        function getPos(e) {
          var rect = annotationCanvas.getBoundingClientRect();
          var touch = e.touches ? e.touches[0] : e;
          return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }

        function startDraw(e) {
          e.preventDefault();
          var pos = getPos(e);
          currentStroke = { points: [pos], color: drawColor, width: drawWidth };
        }

        function moveDraw(e) {
          if (!currentStroke) return;
          e.preventDefault();
          var pos = getPos(e);
          currentStroke.points.push(pos);
          annotationCtx.beginPath();
          annotationCtx.strokeStyle = currentStroke.color;
          annotationCtx.lineWidth = currentStroke.width;
          annotationCtx.lineCap = 'round';
          annotationCtx.lineJoin = 'round';
          var pts = currentStroke.points;
          if (pts.length >= 2) {
            annotationCtx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
            annotationCtx.lineTo(pos.x, pos.y);
          }
          annotationCtx.stroke();
        }

        function endDraw() {
          if (currentStroke && currentStroke.points.length > 1) {
            strokes.push(currentStroke);
          }
          currentStroke = null;
        }

        annotationCanvas.addEventListener('touchstart', startDraw, { passive: false });
        annotationCanvas.addEventListener('touchmove', moveDraw, { passive: false });
        annotationCanvas.addEventListener('touchend', endDraw);
        annotationCanvas.addEventListener('mousedown', startDraw);
        annotationCanvas.addEventListener('mousemove', moveDraw);
        annotationCanvas.addEventListener('mouseup', endDraw);
      }

      function closeAnnotation() {
        if (annotationOverlay) {
          document.body.removeChild(annotationOverlay);
          annotationOverlay = null;
        }
      }

      // --- Voice: Speech-to-Text + Text-to-Speech ---
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      var voiceBtn = document.getElementById('voice-btn');
      var voiceStatusEl = document.getElementById('voice-status');
      var voiceRecognition = null;
      var voiceActive = false;
      var voiceNoticeShown = false;

      if (SpeechRecognition && window.isSecureContext) {
        voiceBtn.classList.remove('hidden');

        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.lang = '';
        voiceRecognition.maxAlternatives = 1;

        voiceBtn.addEventListener('click', function() {
          if (voiceActive) {
            voiceRecognition.abort();
            resetVoiceState();
            return;
          }

          voiceActive = true;
          voiceBtn.classList.add('listening');
          if (!voiceNoticeShown) {
            showVoiceStatus('Voice uses cloud speech recognition');
            voiceNoticeShown = true;
            setTimeout(function() {
              showVoiceStatus('Listening...');
            }, 1500);
          } else {
            showVoiceStatus('Listening...');
          }

          try {
            voiceRecognition.start();
          } catch (e) {
            resetVoiceState();
          }
        });

        voiceRecognition.onresult = function(event) {
          var transcript = event.results[0][0].transcript;
          var confidence = event.results[0][0].confidence;

          voiceBtn.classList.remove('listening');
          voiceBtn.classList.add('processing');
          showVoiceStatus(transcript.length > 40 ? transcript.substring(0, 40) + '...' : transcript);

          fetch(origin + '/mode-switch?token=' + encodeURIComponent(token), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'voice_message',
              text: transcript,
              confidence: confidence
            })
          })
          .then(function(res) {
            if (!res.ok) throw new Error('Send failed');
            showVoiceStatus('Sent!');
            setTimeout(resetVoiceState, 1500);
          })
          .catch(function() {
            showVoiceStatus('Failed to send');
            setTimeout(resetVoiceState, 2000);
          });
        };

        voiceRecognition.onerror = function(event) {
          var msg = 'Error';
          if (event.error === 'no-speech') msg = 'No speech detected';
          else if (event.error === 'not-allowed') msg = 'Mic access denied';
          else if (event.error === 'network') msg = 'Need internet for voice';
          else if (event.error === 'aborted') { resetVoiceState(); return; }

          showVoiceStatus(msg);
          setTimeout(resetVoiceState, 2000);
        };

        voiceRecognition.onend = function() {
          if (voiceActive && voiceBtn.classList.contains('listening')) {
            resetVoiceState();
          }
        };
      }

      function resetVoiceState() {
        voiceActive = false;
        voiceBtn.classList.remove('listening', 'processing');
        hideVoiceStatus();
      }

      function showVoiceStatus(text) {
        voiceStatusEl.textContent = text;
        voiceStatusEl.style.display = '';
      }

      function hideVoiceStatus() {
        voiceStatusEl.style.display = 'none';
      }
    })();
  </script>
</body>
</html>`;
}
