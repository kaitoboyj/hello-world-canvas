try { require('dotenv').config(); } catch (_e) { /* Netlify CI injects env vars directly; .env file not needed */ }
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('SUPABASE_URL (or VITE_/NEXT_PUBLIC_ alias)');
    if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY (starts with sb_secret_ or eyJhbGciOiJIUzI1NiJ9...)');
    throw new Error(
      '[NETLIFY FUNCTION CONFIG ERROR] Missing required environment variable(s): ' +
      missing.join(', ') +
      '. Go to Netlify → Site settings → Environment variables and add them.' +
      ' Then re-trigger a deploy.'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getPublishableSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!key) missing.push('SUPABASE_PUBLISHABLE_KEY (starts with sb_publishable_...)');
    throw new Error(
      '[NETLIFY FUNCTION CONFIG ERROR] Missing required environment variable(s): ' +
      missing.join(', ') +
      '. Go to Netlify → Site settings → Environment variables and add them.' +
      ' Then re-trigger a deploy.'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function checkTelegramEnv() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    const missing = [];
    if (!token) missing.push('TELEGRAM_BOT_TOKEN (format: 123456789:AAxxxx...)');
    if (!chatId) missing.push('TELEGRAM_CHAT_ID (format: -1001234567890)');
    throw new Error(
      '[NETLIFY FUNCTION CONFIG ERROR] Missing Telegram env var(s): ' +
      missing.join(', ') +
      '. Add them in Netlify → Site settings → Environment variables → re-deploy.'
    );
  }
  return { token, chatId };
}

function checkAdminPasswordEnv() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error(
      '[NETLIFY FUNCTION CONFIG ERROR] ADMIN_PASSWORD environment variable is not set.' +
      ' Add it in Netlify → Site settings → Environment variables → re-deploy.'
    );
  }
  return pw;
}

function corsHeaders(origin) {
  const allowed = origin || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Session',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function signAdminSession() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 24 * 60 * 60;
  const payload = { sub: 'admin', iat: now, exp };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyAdminSession(token) {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expected = crypto
    .createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getAdminSession(event) {
  const header = event.headers['x-admin-session'] || event.headers['X-Admin-Session'];
  if (header) return verifyAdminSession(header);
  const cookie = event.headers.cookie || event.headers.Cookie || '';
  const match = cookie.match(/admin_session=([^;]+)/);
  if (match) return verifyAdminSession(match[1]);
  return null;
}

function chunkText(text, maxLen = 4000) {
  const chunks = [];
  let current = '';
  const lines = text.split('\n');
  for (const line of lines) {
    if (current.length + line.length + 1 > maxLen && current.length > 0) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function sendTelegramRequest(method, body, isMultipart = false, files = []) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('Telegram credentials not configured');

  const url = `https://api.telegram.org/bot${token}/${method}`;

  if (isMultipart && files.length > 0) {
    const boundary = '----NetlifyBoundary' + Date.now();
    const chunks = [];
    const data = { ...body, chat_id: chatId };
    for (const [k, v] of Object.entries(data)) {
      chunks.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${typeof v === 'string' ? v : JSON.stringify(v)}\r\n`
      ));
    }
    for (const f of files) {
      chunks.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; filename="${f.filename}"\r\nContent-Type: ${f.mime || 'application/octet-stream'}\r\n\r\n`
      ));
      chunks.push(f.buffer);
      chunks.push(Buffer.from('\r\n'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const full = Buffer.concat(chunks);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: full,
    });
    return { ok: resp.ok, status: resp.status, body: await resp.text() };
  }

  const finalBody = { ...body, chat_id: chatId };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finalBody),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, body: text };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  getSupabase,
  getPublishableSupabase,
  corsHeaders,
  jsonResponse,
  timingSafeEqual,
  signAdminSession,
  verifyAdminSession,
  getAdminSession,
  chunkText,
  sendTelegramRequest,
  sleep,
  checkTelegramEnv,
  checkAdminPasswordEnv,
};
