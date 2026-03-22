export function renderMobilePage(token: string, uploadUrl: string): string {
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
  </style>
</head>
<body>
  <div class="app-title">CCPhoto</div>

  <div class="main" id="main-area">
    <button id="take-photo-btn" type="button">Take Photo</button>
  </div>

  <input type="file" id="file-input" accept="image/*" capture="environment">

  <div class="photo-count" id="photo-count"></div>

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

      takePhotoBtn.addEventListener('click', function() {
        if (!busy) {
          fileInput.value = '';
          fileInput.click();
        }
      });

      fileInput.addEventListener('change', function() {
        if (!fileInput.files || !fileInput.files[0]) return;
        if (busy) return;
        busy = true;

        var file = fileInput.files[0];

        // Show uploading state
        mainArea.innerHTML =
          '<div class="uploading">' +
            '<div class="spinner"></div>' +
            '<div class="uploading-text">Uploading...</div>' +
          '</div>';

        // Create thumbnail URL before upload
        var thumbUrl = URL.createObjectURL(file);

        var formData = new FormData();
        formData.append('photo', file);

        var separator = uploadUrl.indexOf('?') === -1 ? '?' : '&';
        var url = uploadUrl + separator + 'token=' + encodeURIComponent(token);

        fetch(url, {
          method: 'POST',
          body: formData
        })
        .then(function(res) {
          if (!res.ok) throw new Error('Upload failed (' + res.status + ')');
          return res;
        })
        .then(function() {
          photoCount++;
          updateCount();

          // Show success state
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

          setTimeout(function() {
            resetToButton();
          }, 3000);
        });
      });

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
    })();
  </script>
</body>
</html>`;
}
