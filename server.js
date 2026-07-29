const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config();

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const indexHtml = path.join(publicDir, 'index.html');

const authentikDomain = process.env.AUTHENTIK_DOMAIN;
const clientId = process.env.AUTHENTIK_CLIENT_ID;
const clientSecret = process.env.AUTHENTIK_CLIENT_SECRET;
const redirectUri = process.env.AUTHENTIK_REDIRECT_URI || 'http://localhost:3000/auth/callback';
const authEnabled = !!(authentikDomain && clientId && clientSecret);

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

function oauthRequest(urlPath, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, authentikDomain);
    const mod = authentikDomain.startsWith('https') ? https : http;
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method,
      headers: {},
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
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
    if (body) req.write(body.toString());
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

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (authEnabled && pathname === '/auth/login') {
    const state = crypto.randomBytes(16).toString('hex');
    setCookie(res, 'oauth_state', state, { httpOnly: true, sameSite: 'Lax', path: '/' });
    const authUrl = `${authentikDomain}/application/o/authorize/` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=openid+profile+email` +
      `&state=${state}`;
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  if (authEnabled && pathname === '/auth/callback') {
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const cookies = parseCookies(req);
    if (!code || !state || state !== cookies.oauth_state) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Invalid request');
      return;
    }
    setCookie(res, 'oauth_state', '', { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 0 });
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });
    oauthRequest('/application/o/token/', 'POST', tokenBody)
      .then(tokens => {
        if (!tokens.access_token) throw new Error('No access_token in response');
        const userinfoUrl = new URL('/application/o/userinfo/', authentikDomain).pathname;
        const mod = authentikDomain.startsWith('https') ? https : http;
        const u = new URL(userinfoUrl, authentikDomain);
        const opts = {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${tokens.access_token}` },
        };
        return new Promise((resolve, reject) => {
          const r = mod.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
              try { resolve(JSON.parse(d)); }
              catch (e) { reject(e); }
            });
          });
          r.on('error', reject);
          r.end();
        });
      })
      .then(user => {
        const sid = createSession(user);
        setCookie(res, 'session_id', sid, { httpOnly: true, sameSite: 'Lax', path: '/' });
        res.writeHead(302, { Location: '/' });
        res.end();
      })
      .catch(err => {
        console.error('Auth error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Authentication failed');
      });
    return;
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
