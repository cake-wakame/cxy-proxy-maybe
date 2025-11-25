function loadProxy() {
  const urlInput = document.getElementById('urlInput');
  const url = urlInput.value.trim();

  if (!url) {
    alert('URLを入力してください');
    return;
  }

  let targetUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    targetUrl = 'https://' + url;
  }

  try {
    new URL(targetUrl);

    const proxyUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;

    const newWindow = window.open('about:blank', '_blank');

    if (newWindow) {
      newWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Proxy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; overflow: hidden; }
    .proxy-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .proxy-header button {
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .proxy-header button:hover { background: rgba(255, 255, 255, 0.3); }
    .url-display {
      flex: 1;
      background: rgba(255, 255, 255, 0.9);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      user-select: text;
    }
    iframe {
      width: 100%;
      height: calc(100vh - 60px);
      border: none;
      background: white;
    }
  </style>
</head>
<body>
  <div class="proxy-header">
    <button onclick="window.history.back()">← 戻る</button>
    <button onclick="goForward()">進む →</button>
    <div class="url-display" id="currentUrlDisplay">about:blank</div>
    <button onclick="reloadFrame()">🔄 再読込</button>
    <button onclick="window.close()">閉じる</button>
  </div>
  <iframe id="proxyFrame" src="${proxyUrl}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"></iframe>
  
  <script>
    function goForward() {
      try {
        window.history.forward();
      } catch (e) {
        console.log('Cannot go forward');
      }
    }
    
    function reloadFrame() {
      const iframe = document.getElementById('proxyFrame');
      iframe.src = iframe.src;
    }
  </script>
</body>
</html>
      `);
      newWindow.document.close();
      urlInput.value = '';
    } else {
      alert('ポップアップがブロックされました。ポップアップを許可してください。');
    }
  } catch (error) {
    alert('有効なURLを入力してください');
  }
}

document.getElementById('urlInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    loadProxy();
  }
});
