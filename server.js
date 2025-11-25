const express = require('express');
const cors = require('cors');
const path = require('path');
const { proxyRequest } = require('./src/proxyPipeline');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.use((req, res, next) => {
  if (req.path === '/proxy') {
    return next();
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === '/proxy') {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.all('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    await proxyRequest(targetUrl, req, res);
  } catch (error) {
    console.error('Proxy error:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Secure proxy server is running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
});
