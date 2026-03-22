export function renderMobilePage(token: string, uploadUrl: string, options?: { liveMode?: boolean }): string {
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

    .error-msg {
      font-size: 16px;
      font-weight: 600;
      color: #ef4444;
      text-align: center;
      padding: 0 24px;
    }

    .photo-count {
      position: absolute;
      bottom: 48px;
      font-size: 14px;
      color: #555;
      font-weight: 500;
    }

    .photo-count.active {
      color: #888;
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

    .content-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 44px;
      background: #1a1a1a;
      border-top: 1px solid #333;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      color: #60a5fa;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      z-index: 50;
    }

    .content-badge {
      background: #2563eb;
      color: #fff;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 12px;
      min-width: 20px;
      text-align: center;
    }

    .toggle-arrow {
      font-size: 10px;
      transition: transform 0.2s;
    }

    .toggle-arrow.open {
      transform: rotate(180deg);
    }

    .content-panel {
      position: fixed;
      bottom: 44px;
      left: 0;
      right: 0;
      max-height: 50vh;
      background: #1a1a1a;
      border-top: 1px solid #333;
      overflow-y: auto;
      z-index: 49;
      -webkit-overflow-scrolling: touch;
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

    .frame-info {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(0,0,0,0.6);
      color: #aaa;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
    }

    .live-status {
      font-size: 14px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="app-title">CCPhoto</div>

${options?.liveMode ? `
  <div class="main" id="main-area">
    <div class="live-container" id="live-container">
      <video id="live-video" class="live-video" playsinline muted autoplay></video>
      <div class="live-badge"><div class="live-dot"></div> LIVE</div>
      <div class="frame-info" id="frame-info">connecting...</div>
      <canvas id="frame-canvas" style="display:none;"></canvas>
    </div>
    <div class="live-status" id="live-status">Starting camera...</div>
  </div>
` : `
  <div class="main" id="main-area">
    <button id="take-photo-btn" type="button">Take Photo</button>
  </div>

  <input type="file" id="file-input" accept="image/*" capture="environment">
`}

  <div class="photo-count" id="photo-count"></div>

  <div id="content-bar" class="content-bar" style="display:none;" role="button">
    <span class="content-badge" id="content-badge">0</span> from Claude
    <span class="toggle-arrow" id="toggle-arrow">&#9650;</span>
  </div>
  <div id="content-panel" class="content-panel" style="display:none;">
    <div id="content-messages"></div>
  </div>

  <script>
    (function() {
      var token = ${JSON.stringify(token)};
      var uploadUrl = ${JSON.stringify(uploadUrl)};
      var photoCount = 0;
      var busy = false;

      var mainArea = document.getElementById('main-area');
      var fileInput = document.getElementById('file-input');
      var photoCountEl = document.getElementById('photo-count');
      var takePhotoBtn = document.getElementById('take-photo-btn');

      if (takePhotoBtn) {
        takePhotoBtn.addEventListener('click', function() {
          if (!busy) {
            fileInput.value = '';
            fileInput.click();
          }
        });
      }

      if (fileInput) {
        fileInput.addEventListener('change', function() {
          if (!fileInput.files || !fileInput.files[0]) return;
          if (busy) return;

          var file = fileInput.files[0];
          var reader = new FileReader();
          reader.onload = function() {
            showAnnotationScreen(reader.result, file);
          };
          reader.readAsDataURL(file);
        });
      }

      function resetToButton() {
        busy = false;
        mainArea.innerHTML = '<button id="take-photo-btn" type="button">Take Photo</button>';
        var btn = document.getElementById('take-photo-btn');
        btn.addEventListener('click', function() {
          if (!busy) {
            fileInput.value = '';
            fileInput.click();
          }
        });
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
      // SSE: listen for photo requests from Claude
      var evtUrl = ${JSON.stringify(uploadUrl.replace('/upload', '/events'))};
      var evtSeparator = evtUrl.indexOf('?') === -1 ? '?' : '&';
      var evtSource = new EventSource(evtUrl + evtSeparator + 'token=' + encodeURIComponent(token));

      evtSource.addEventListener('photo-requested', function() {
        // Vibrate if available (Android)
        if (navigator.vibrate) navigator.vibrate(200);

        // Flash the button if we're in the ready state
        var btn = document.getElementById('take-photo-btn');
        if (btn) {
          btn.classList.add('requesting');
          // Add notice text
          var existing = document.querySelector('.request-notice');
          if (!existing) {
            var notice = document.createElement('div');
            notice.className = 'request-notice';
            notice.textContent = 'Photo requested!';
            mainArea.insertBefore(notice, mainArea.firstChild);
          }
        }
      });

      // Content display from Claude
      var contentBar = document.getElementById('content-bar');
      var contentPanel = document.getElementById('content-panel');
      var contentMessages = document.getElementById('content-messages');
      var contentBadge = document.getElementById('content-badge');
      var toggleArrow = document.getElementById('toggle-arrow');
      var messageCount = 0;
      var panelOpen = false;

      contentBar.addEventListener('click', function() {
        panelOpen = !panelOpen;
        contentPanel.style.display = panelOpen ? '' : 'none';
        toggleArrow.classList.toggle('open', panelOpen);
      });

      evtSource.addEventListener('content-push', function(e) {
        var data = JSON.parse(e.data);
        messageCount++;
        contentBadge.textContent = messageCount;
        contentBar.style.display = '';

        if (navigator.vibrate) navigator.vibrate(100);

        var msg = document.createElement('div');
        msg.className = 'content-message';

        var label = document.createElement('div');
        label.className = 'content-label';
        label.textContent = 'From Claude';
        msg.appendChild(label);

        if (data.text) {
          var textDiv = document.createElement('div');
          textDiv.className = 'content-text';
          textDiv.innerHTML = renderBasicMarkdown(data.text);
          msg.appendChild(textDiv);
        }

        if (data.imageData && data.mimeType) {
          var img = document.createElement('img');
          img.className = 'content-image';
          img.src = 'data:' + data.mimeType + ';base64,' + data.imageData;
          img.alt = 'From Claude';
          msg.appendChild(img);
        }

        contentMessages.insertBefore(msg, contentMessages.firstChild);
      });

      function renderBasicMarkdown(text) {
        var escaped = escapeHtml(text);
        var lines = escaped.split('\\n');
        var result = [];
        var inCode = false;
        var codeLines = [];

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.match(/^\`\`\`/)) {
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
          line = line.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
          result.push(line === '' ? '<br>' : line + '<br>');
        }
        if (inCode) {
          result.push('<pre><code>' + codeLines.join('\\n') + '</code></pre>');
        }
        return result.join('\\n');
      }

      // Annotation screen
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
        busy = true;

        // Create overlay
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
        sizeBtn.addEventListener('click', function() {
          drawWidth = drawWidth === 3 ? 8 : 3;
          sizeBtn.textContent = drawWidth === 3 ? 'Thin' : 'Thick';
        });
        toolbar.appendChild(sizeBtn);

        var undoBtn = document.createElement('button');
        undoBtn.className = 'tool-btn';
        undoBtn.textContent = 'Undo';
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
        clearBtn.addEventListener('click', function() {
          strokes = [];
          redrawCanvas();
        });
        toolbar.appendChild(clearBtn);

        var sep2 = document.createElement('div');
        sep2.className = 'toolbar-sep';
        toolbar.appendChild(sep2);

        var skipBtn = document.createElement('button');
        skipBtn.className = 'tool-btn';
        skipBtn.textContent = 'Skip';
        skipBtn.addEventListener('click', function() {
          uploadFile(originalFile);
          closeAnnotation();
        });
        toolbar.appendChild(skipBtn);

        var sendBtn = document.createElement('button');
        sendBtn.className = 'tool-btn primary';
        sendBtn.textContent = 'Send';
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

        // Draw photo scaled to fit
        var scale = Math.min(cw / originalImage.width, ch / originalImage.height);
        var w = originalImage.width * scale;
        var h = originalImage.height * scale;
        var x = (cw - w) / 2;
        var y = (ch - h) / 2;
        annotationCtx.drawImage(originalImage, x, y, w, h);

        // Replay strokes
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
          // Draw live segment
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

      function uploadFile(file) {
        // Show uploading state
        mainArea.innerHTML =
          '<div class="uploading">' +
            '<div class="spinner"></div>' +
            '<div class="uploading-text">Uploading...</div>' +
          '</div>';

        var thumbUrl = URL.createObjectURL(file);
        var formData = new FormData();
        formData.append('photo', file);

        var separator = uploadUrl.indexOf('?') === -1 ? '?' : '&';
        var url = uploadUrl + separator + 'token=' + encodeURIComponent(token);

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
            '</div>';
          setTimeout(function() {
            URL.revokeObjectURL(thumbUrl);
            resetToButton();
          }, 2000);
        })
        .catch(function(err) {
          URL.revokeObjectURL(thumbUrl);
          mainArea.innerHTML =
            '<div class="error-msg">' + escapeHtml(err.message || 'Upload failed') + '</div>';
          setTimeout(function() { resetToButton(); }, 3000);
        });
      }
${options?.liveMode ? `
      // Live mode
      var liveVideo = document.getElementById('live-video');
      var frameCanvas = document.getElementById('frame-canvas');
      var frameCtx = frameCanvas.getContext('2d');
      var frameInfo = document.getElementById('frame-info');
      var liveStatus = document.getElementById('live-status');
      var frameUrl = uploadUrl; // uploadUrl is already the frame URL in live mode
      var frameCount = 0;
      var frameInterval = null;
      var FRAME_INTERVAL_MS = 3000;

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      .then(function(stream) {
        liveVideo.srcObject = stream;
        liveStatus.textContent = 'Camera active — streaming to Claude';

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

      function startFrameCapture() {
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
              frameCount++;
              frameInfo.textContent = frameCount + ' frames';
            })
            .catch(function() {
              frameInfo.textContent = 'upload error';
            });
          }, 'image/jpeg', 0.7);
        }, FRAME_INTERVAL_MS);
      }
` : ''}
    })();
  </script>
</body>
</html>`;
}
