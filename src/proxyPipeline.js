const { request } = require('undici');
const { validateUrl } = require('./validation');
const { rewriteHtml, rewriteCss } = require('./rewriter');
const zlib = require('zlib');
const { promisify } = require('util');
const iconv = require('iconv-lite');

const gunzip = promisify(zlib.gunzip);
const brotliDecompress = promisify(zlib.brotliDecompress);
const inflate = promisify(zlib.inflate);
const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);
const deflate = promisify(zlib.deflate);

const MAX_REDIRECTS = 5;
const MAX_BODY_SIZE = 10 * 1024 * 1024;

const bufferRequestBody = async (clientReq) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    
    clientReq.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    
    clientReq.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    clientReq.on('error', reject);
  });
};

const decompressResponse = async (buffer, encoding) => {
  if (!encoding) return buffer;
  
  const lowerEncoding = encoding.toLowerCase();
  
  try {
    if (lowerEncoding.includes('gzip') || lowerEncoding.includes('x-gzip')) {
      return await gunzip(buffer);
    } else if (lowerEncoding.includes('br')) {
      return await brotliDecompress(buffer);
    } else if (lowerEncoding.includes('deflate')) {
      return await inflate(buffer);
    }
  } catch (error) {
    console.error('Decompression error:', error);
    return buffer;
  }
  
  return buffer;
};

const compressResponse = async (buffer, encoding) => {
  if (!encoding) return buffer;
  
  const lowerEncoding = encoding.toLowerCase();
  
  try {
    if (lowerEncoding.includes('gzip') || lowerEncoding.includes('x-gzip')) {
      return await gzip(buffer);
    } else if (lowerEncoding.includes('br')) {
      return await brotliCompress(buffer);
    } else if (lowerEncoding.includes('deflate')) {
      return await deflate(buffer);
    }
  } catch (error) {
    console.error('Compression error:', error);
    return buffer;
  }
  
  return buffer;
};

const extractCharsetFromContentType = (contentType) => {
  if (!contentType) return null;
  
  const match = contentType.match(/charset=([^;]+)/i);
  if (match && match[1]) {
    return match[1].trim().replace(/['"]/g, '');
  }
  
  return null;
};

const proxyRequest = async (targetUrl, clientReq, clientRes) => {
  let currentUrl = targetUrl;
  let redirectCount = 0;
  let requestBody = null;
  let originalMethod = clientReq.method;

  if (clientReq.method === 'POST' || clientReq.method === 'PUT' || clientReq.method === 'PATCH') {
    try {
      requestBody = await bufferRequestBody(clientReq);
    } catch (error) {
      if (error.message === 'Request body too large') {
        clientRes.status(413).send('Request body too large');
        return;
      }
      clientRes.status(500).send('Error reading request body');
      return;
    }
  }

  while (redirectCount <= MAX_REDIRECTS) {
    const validation = await validateUrl(currentUrl);
    if (!validation.valid) {
      clientRes.status(403).send(validation.error);
      return;
    }

    try {
      const url = new URL(currentUrl);
      
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': clientReq.headers.accept || '*/*',
        'Accept-Language': clientReq.headers['accept-language'] || 'ja,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': url.origin
      };

      if (clientReq.headers.cookie) {
        headers['Cookie'] = clientReq.headers.cookie;
      }
      
      if (clientReq.headers.authorization) {
        headers['Authorization'] = clientReq.headers.authorization;
      }
      
      if (clientReq.headers['content-type'] && requestBody) {
        headers['Content-Type'] = clientReq.headers['content-type'];
      }

      const options = {
        method: originalMethod,
        headers: headers,
        maxRedirections: 0
      };

      if (requestBody && (originalMethod === 'POST' || originalMethod === 'PUT' || originalMethod === 'PATCH')) {
        options.body = requestBody;
      }

      const { statusCode, headers: responseHeaders, body: responseBody } = await request(currentUrl, options);

      if (statusCode >= 300 && statusCode < 400 && responseHeaders.location) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          clientRes.status(508).send('Too many redirects');
          return;
        }
        
        const locationUrl = new URL(responseHeaders.location, currentUrl);
        currentUrl = locationUrl.href;
        
        if (statusCode === 303 || (statusCode === 301 || statusCode === 302) && originalMethod === 'POST') {
          originalMethod = 'GET';
          requestBody = null;
        }
        
        continue;
      }

      clientRes.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      clientRes.set('Pragma', 'no-cache');
      clientRes.set('Expires', '0');

      const contentType = responseHeaders['content-type'] || '';
      const contentEncoding = responseHeaders['content-encoding'];
      
      clientRes.status(statusCode);
      
      for (const [key, value] of Object.entries(responseHeaders)) {
        if (key.toLowerCase() === 'set-cookie') {
          clientRes.set(key, value);
        } else if (!['content-encoding', 'transfer-encoding', 'content-length', 'connection'].includes(key.toLowerCase())) {
          clientRes.set(key, value);
        }
      }
      
      if (contentType.includes('text/html') || contentType.includes('text/css') || contentType.includes('application/xhtml+xml')) {
        const chunks = [];
        for await (const chunk of responseBody) {
          chunks.push(chunk);
        }
        let buffer = Buffer.concat(chunks);
        
        buffer = await decompressResponse(buffer, contentEncoding);
        
        const charset = extractCharsetFromContentType(contentType) || 'utf-8';
        let text;
        
        try {
          if (iconv.encodingExists(charset)) {
            text = iconv.decode(buffer, charset);
          } else {
            text = buffer.toString('utf-8');
          }
        } catch (error) {
          console.error('Charset decode error:', error);
          text = buffer.toString('utf-8');
        }
        
        const baseUrl = currentUrl;
        
        let rewrittenText;
        let finalContentType;
        if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
          rewrittenText = rewriteHtml(text, baseUrl);
          finalContentType = contentType;
        } else if (contentType.includes('text/css')) {
          rewrittenText = rewriteCss(text, baseUrl);
          finalContentType = contentType;
        } else {
          rewrittenText = text;
          finalContentType = contentType;
        }
        
        clientRes.set('Content-Type', finalContentType);
        
        let outputBuffer;
        try {
          if (iconv.encodingExists(charset)) {
            outputBuffer = iconv.encode(rewrittenText, charset);
          } else {
            outputBuffer = Buffer.from(rewrittenText, 'utf-8');
          }
        } catch (error) {
          console.error('Charset encode error:', error);
          outputBuffer = Buffer.from(rewrittenText, 'utf-8');
        }
        
        if (contentEncoding) {
          outputBuffer = await compressResponse(outputBuffer, contentEncoding);
          clientRes.set('Content-Encoding', contentEncoding);
        }
        
        clientRes.set('Content-Length', outputBuffer.length.toString());
        clientRes.send(outputBuffer);
        return;
      } else {
        if (contentEncoding) {
          clientRes.set('Content-Encoding', contentEncoding);
        }
        
        for await (const chunk of responseBody) {
          clientRes.write(chunk);
        }
        clientRes.end();
        return;
      }

    } catch (error) {
      console.error('Proxy error:', error);
      if (!clientRes.headersSent) {
        clientRes.status(500).send('Error fetching the URL: ' + error.message);
      }
      return;
    }
  }
};

module.exports = {
  proxyRequest
};
