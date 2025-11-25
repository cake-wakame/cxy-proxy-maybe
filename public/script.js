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
    <div class="url-display">about:blank</div>
    <button onclick="window.close()">閉じる</button>
  </div>
  <iframe src="${proxyUrl}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"></iframe>
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

function goBack() {
  const iframe = document.getElementById('proxyFrame');
  try {
    iframe.contentWindow.history.back();
  } catch (e) {
    alert('戻れるページがありません');
  }
}

function goHome() {
  document.getElementById('landing-page').style.display = 'flex';
  document.getElementById('proxy-container').style.display = 'none';
  document.getElementById('proxyFrame').src = 'about:blank';
}

document.getElementById('urlInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    loadProxy();
  }
});
