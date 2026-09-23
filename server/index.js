const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configure multer for file uploads (store in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Session');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Netlify functions routes
const telegramProxy = require('../netlify/functions/telegram-proxy');
const submitApplication = require('../netlify/functions/submit-application');

// Helper to convert Express multipart request to Netlify event format
function createNetlifyEventFromMultipart(req, method) {
  const boundary = req.headers['content-type'].match(/boundary=(.+)/)?.[1];
  
  if (!boundary) {
    throw new Error('No boundary found in multipart content-type');
  }
  
  // Build multipart body as Buffer
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}\r\n`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--\r\n`);
  const crlf = Buffer.from('\r\n');
  
  // Add text fields
  if (req.body && Object.keys(req.body).length > 0) {
    for (const [key, value] of Object.entries(req.body)) {
      parts.push(boundaryBuffer);
      parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`));
      parts.push(Buffer.from(String(value)));
      parts.push(crlf);
    }
  }
  
  // Add files
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      parts.push(boundaryBuffer);
      parts.push(Buffer.from(
        `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.originalname}"\r\n` +
        `Content-Type: ${file.mimetype}\r\n\r\n`
      ));
      parts.push(file.buffer);
      parts.push(crlf);
    }
  }
  
  parts.push(endBoundaryBuffer);
  
  const bodyBuffer = Buffer.concat(parts);
  
  return {
    httpMethod: req.method,
    path: `/.netlify/functions/telegram-proxy/${method}`,
    headers: req.headers,
    body: bodyBuffer.toString('base64'),
    isBase64Encoded: true,
  };
}

app.all('/.netlify/functions/telegram-proxy/*', upload.any(), async (req, res) => {
  const method = req.path.split('/').pop();
  
  let event;
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('multipart/form-data')) {
    console.log(`📤 Multipart request to ${method}`);
    if (req.files && req.files.length > 0) {
      console.log(`   Files: ${req.files.map(f => `${f.originalname} (${f.size} bytes)`).join(', ')}`);
    }
    event = createNetlifyEventFromMultipart(req, method);
  } else {
    event = {
      httpMethod: req.method,
      path: `/.netlify/functions/telegram-proxy/${method}`,
      headers: req.headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
      isBase64Encoded: false,
    };
  }
  
  try {
    const response = await telegramProxy.handler(event, {});
    res.status(response.statusCode);
    
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    const responseBody = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
    
    if (contentType.includes('multipart/form-data')) {
      const result = JSON.parse(responseBody);
      if (result.ok) {
        console.log(`   ✅ Successfully sent to Telegram`);
      } else {
        console.log(`   ❌ Telegram API error:`, result);
      }
    }
    
    res.send(responseBody);
  } catch (error) {
    console.error('Error handling telegram-proxy:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.post('/.netlify/functions/submit-application', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    headers: req.headers,
    body: JSON.stringify(req.body),
  };
  
  try {
    const response = await submitApplication.handler(event, {});
    res.status(response.statusCode);
    
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    res.send(response.body);
  } catch (error) {
    console.error('Error handling submit-application:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, '..')}`);
  console.log(`📡 Netlify functions available at: /.netlify/functions/*\n`);
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn('⚠️  WARNING: Telegram credentials not configured!');
    console.warn('   Create a .env file with:');
    console.warn('   - TELEGRAM_BOT_TOKEN');
    console.warn('   - TELEGRAM_CHAT_ID\n');
  } else {
    console.log('✅ Telegram notifications configured\n');
  }
});
