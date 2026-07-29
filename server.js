const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config();

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const indexHtml = path.join(publicDir, 'index.html');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const authEnabled = !!(supabaseUrl && supabaseAnonKey);

const sessions = new Map();

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const result = {};
  header.split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) {
      result[c.substring(0, i).trim()] = c.substring(i + 1).trim();
    }
  });
  return result;
}

function setCookie(res, name, value, opts) {
  let parts = [`${name}=${value}`];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  const existing = res.getHeader('Set-Cookie');
  const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  cookies.push(parts.join('; '));
  res.setHeader('Set-Cookie', cookies);
}

function createSession(user) {
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, { user, createdAt: Date.now() });
  return id;
}

function getSession(req) {
  const cookies = parseCookies(req);
  const sid = cookies.session_id;
  if (!sid) return null;
  return sessions.get(sid) || null;
}

function destroySession(req) {
  const cookies = parseCookies(req);
  if (cookies.session_id) sessions.delete(cookies.session_id);
}

function parseFormBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const result = {};
      for (const [key, value] of params) {
        result[key] = value;
      }
      resolve(result);
    });
    req.on('error', reject);
  });
}

function supabaseRequest(urlPath, method, body, accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, supabaseUrl);
    const mod = supabaseUrl.startsWith('https') ? https : http;
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': supabaseAnonKey,
      },
    };
    if (accessToken) {
      opts.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = mod.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.js' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
}

function loginFormHtml(error) {
  const errorBlock = error
    ? '<div class="error">Invalid email or password.</div>'
    : '';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1"/>\n<title>TarkovLab \u2014 Sign In</title>\n<link rel="icon" type="image/png" href="/assets/icon.png"/>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{background:#0a0a0a;color:#c8c3b6;font-family:\'Rajdhani\',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}\n.login-box{background:#141312;border:1px solid #2a2825;padding:40px;width:100%;max-width:400px}\n.login-box h1{font-family:\'Oswald\',sans-serif;font-weight:600;font-size:1.6rem;text-transform:uppercase;letter-spacing:.04em;color:#c8c3b6;margin-bottom:24px;text-align:center}\n.login-box label{display:block;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#8a8578;margin-bottom:6px}\n.login-box input{width:100%;background:#1b1a18;border:1px solid #3a3733;color:#c8c3b6;font-family:inherit;font-size:1rem;padding:11px 14px;outline:none;margin-bottom:18px}\n.login-box input:focus{border-color:#9a8c5f}\n.login-box button{width:100%;background:#9a8c5f;border:none;color:#0a0a0a;font-family:\'Oswald\',sans-serif;font-weight:600;font-size:1rem;text-transform:uppercase;letter-spacing:.08em;padding:12px;cursor:pointer}\n.login-box button:hover{background:#c0a050}\n.login-box .error{background:rgba(192,144,58,.15);border:1px solid rgba(192,144,58,.4);color:#c0903a;padding:10px 14px;margin-bottom:18px;font-size:.9rem;text-align:center}\n.login-box .logo{text-align:center;margin-bottom:24px}\n.login-box .logo img{height:40px}\n</style>\n</head>\n<body>\n<div class="login-box">\n<div class="logo"><img src="/assets/logo.png" alt="TarkovLab"/></div>\n<h1>Sign In</h1>\n' + errorBlock + '\n<form method="post" action="/auth/login">\n<label for="email">Email</label>\n<input type="email" id="email" name="email" required autocomplete="email"/>\n<label for="password">Password</label>\n<input type="password" id="password" name="password" required autocomplete="current-password"/>\n<button type="submit">Sign In</button>\n</form>\n</div>\n</body>\n</html>';
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === '/auth/login') {
    if (!authEnabled) {
      const accept = req.headers.accept || '';
      if (accept.includes('html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(loginFormHtml());
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: false, disabled: true }));
      return;
    }

    if (req.method === 'GET') {
      const error = requestUrl.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(loginFormHtml(error));
      return;
    }

    if (req.method === 'POST') {
      try {
        const form = await parseFormBody(req);
        const body = JSON.stringify({
          email: form.email,
          password: form.password,
        });
        const data = await supabaseRequest('/auth/v1/token?grant_type=password', 'POST', body);
        if (!data.access_token) {
          res.writeHead(302, { Location: '/auth/login?error=1' });
          res.end();
          return;
        }
        const sid = createSession({
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata || {},
        });
        setCookie(res, 'session_id', sid, { httpOnly: true, sameSite: 'Lax', path: '/' });
        res.writeHead(302, { Location: '/' });
        res.end();
      } catch (err) {
        console.error('Login error:', err);
        res.writeHead(302, { Location: '/auth/login?error=1' });
        res.end();
      }
      return;
    }
  }

  if (authEnabled && pathname === '/auth/logout') {
    destroySession(req);
    setCookie(res, 'session_id', '', { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 0 });
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  if (pathname === '/auth/me') {
    if (!authEnabled) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: false, disabled: true }));
      return;
    }
    const session = getSession(req);
    if (!session) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: false }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: true, user: session.user }));
    return;
  }

  if (pathname === '/') {
    sendFile(res, indexHtml);
    return;
  }

  let filePath = path.join(publicDir, pathname);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (!path.extname(filePath)) {
    const asHtml = filePath + '.html';
    if (fs.existsSync(asHtml)) {
      sendFile(res, asHtml);
      return;
    }
  }

  fs.stat(filePath, (err) => {
    if (err) {
      sendFile(res, indexHtml);
    } else {
      sendFile(res, filePath);
    }
  });
});

server.listen(port, () => {
  console.log(`TarkovLab running on http://localhost:${port}`);
});
