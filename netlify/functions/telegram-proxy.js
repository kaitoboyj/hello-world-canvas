const { jsonResponse, corsHeaders, sendTelegramRequest } = require('./_shared/utils');

const ALLOWED_METHODS = new Set([
  'sendMessage',
  'sendPhoto',
  'sendDocument',
  'sendMediaGroup',
]);

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const method = event.path.split('/').pop();
  if (!ALLOWED_METHODS.has(method)) {
    return jsonResponse(400, { error: `Method ${method} not allowed. Permitted: ${Array.from(ALLOWED_METHODS).join(', ')}` });
  }

  try {
    const ct = event.headers['content-type'] || event.headers['Content-Type'] || '';
    let body;
    let isMultipart = false;
    let files = [];

    if (ct.includes('multipart/form-data')) {
      const raw = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
      const boundaryMatch = ct.match(/boundary=("([^"]+)"|([^;]+))/);
      if (!boundaryMatch) return jsonResponse(400, { error: 'Invalid multipart content-type' });
      const boundaryValue = (boundaryMatch[2] || boundaryMatch[3] || '').trim();
      const boundary = '--' + boundaryValue;
      const sections = raw.toString('binary').split(boundary).slice(1, -1);
      body = {};
      for (const section of sections) {
        const sepIndex = section.indexOf('\r\n\r\n');
        if (sepIndex === -1) continue;
        const head = section.slice(0, sepIndex);
        const data = section.slice(sepIndex + 4).replace(/\r\n$/, '');
        const nameMatch = head.match(/name="([^"]+)"/);
        const fileMatch = head.match(/filename="([^"]+)"/);
        const typeMatch = head.match(/Content-Type: ([^\r\n]+)/);
        if (nameMatch && fileMatch) {
          files.push({
            field: nameMatch[1],
            filename: fileMatch[1],
            mime: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
            buffer: Buffer.from(data, 'binary'),
          });
        } else if (nameMatch) {
          body[nameMatch[1]] = data.replace(/\r\n$/, '');
        }
      }
      isMultipart = files.length > 0;
    } else {
      body = event.body ? JSON.parse(event.body) : {};
    }

    delete body.chat_id;
    const result = await sendTelegramRequest(method, body, isMultipart, files);
    try {
      const parsed = JSON.parse(result.body);
      return jsonResponse(result.ok ? 200 : 502, parsed);
    } catch {
      return jsonResponse(result.ok ? 200 : 502, { raw: result.body });
    }
  } catch (err) {
    console.error('telegram-proxy error:', err);
    return jsonResponse(500, { error: 'Internal server error', message: err.message });
  }
};
