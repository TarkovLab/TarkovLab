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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

function supabaseRequest(urlPath, method, body, accessToken, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, supabaseUrl);
    const mod = supabaseUrl.startsWith('https') ? https : http;
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': apiKey || supabaseAnonKey,
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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('Invalid JSON response: ' + data.substring(0, 200))); }
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
    let body = data;
    if (filePath === indexHtml && (process.env.TL_API || process.env.TL_DATA)) {
      const inject = '<script>window.TL_API=' + JSON.stringify(process.env.TL_API || null) +
        ';window.TL_DATA=' + JSON.stringify(process.env.TL_DATA || null) + ';</script>';
      body = Buffer.from(String(body).replace('</body>', inject + '</body>'));
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': (ext === '.js' || filePath === indexHtml) ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(body);
  });
}

function loginFormHtml(error) {
  var errorMsg;
  if (error === 'oauth') errorMsg = 'Google sign-in failed.';
  else if (error) errorMsg = 'Invalid email or password.';
  const errorBlock = errorMsg
    ? '<div class="error">' + errorMsg + '</div>'
    : '';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1"/>\n<title>TarkovLab \u2014 Sign In</title>\n<link rel="icon" type="image/png" href="/assets/icon.png"/>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{background:#0a0a0a;color:#c8c3b6;font-family:\'Rajdhani\',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}\n.login-box{background:#141312;border:1px solid #2a2825;padding:40px;width:100%;max-width:400px}\n.login-box h1{font-family:\'Oswald\',sans-serif;font-weight:600;font-size:1.6rem;text-transform:uppercase;letter-spacing:.04em;color:#c8c3b6;margin-bottom:24px;text-align:center}\n.login-box label{display:block;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#8a8578;margin-bottom:6px}\n.login-box input{width:100%;background:#1b1a18;border:1px solid #3a3733;color:#c8c3b6;font-family:inherit;font-size:1rem;padding:11px 14px;outline:none;margin-bottom:18px}\n.login-box input:focus{border-color:#9a8c5f}\n.login-box button{width:100%;background:#9a8c5f;border:none;color:#0a0a0a;font-family:\'Oswald\',sans-serif;font-weight:600;font-size:1rem;text-transform:uppercase;letter-spacing:.08em;padding:12px;cursor:pointer}\n.login-box button:hover{background:#c0a050}\n.login-box .error{background:rgba(192,144,58,.15);border:1px solid rgba(192,144,58,.4);color:#c0903a;padding:10px 14px;margin-bottom:18px;font-size:.9rem;text-align:center}\n.login-box .logo{text-align:center;margin-bottom:24px}\n.login-box .logo img{height:40px}\n.or-divider{display:flex;align-items:center;margin:20px 0;color:#5a564d;font-size:.8rem;text-transform:uppercase;letter-spacing:.15em}\n.or-divider::before,.or-divider::after{content:"";flex:1;height:1px;background:#2a2825}\n.or-divider span{padding:0 12px}\n.login-box .google-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:#1b1a18;border:1px solid #3a3733;color:#c8c3b6;font-family:\'Oswald\',sans-serif;font-weight:500;font-size:.9rem;text-transform:uppercase;letter-spacing:.06em;padding:11px;cursor:pointer;text-decoration:none;transition:border-color .2s}\n.login-box .google-btn:hover{border-color:#9a8c5f;color:#fff}\n</style>\n</head>\n<body>\n<div class="login-box">\n<div class="logo"><img src="/assets/logo.png" alt="TarkovLab"/></div>\n<h1>Sign In</h1>\n' + errorBlock + '\n<form method="post" action="/auth/login">\n<label for="email">Email</label>\n<input type="email" id="email" name="email" required autocomplete="email"/>\n<label for="password">Password</label>\n<input type="password" id="password" name="password" required autocomplete="current-password"/>\n<button type="submit">Sign In</button>\n</form>\n<div class="or-divider"><span>or</span></div>\n<a href="/auth/google" class="google-btn">\n  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>\n  Sign in with Google\n</a>\n</div>\n</body>\n</html>';
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
        const supRes = await supabaseRequest('/auth/v1/token?grant_type=password', 'POST', body);
        const data = supRes.body;
        if (!data.access_token) {
          res.writeHead(302, { Location: '/auth/login?error=1' });
          res.end();
          return;
        }
          const meta = data.user.user_metadata || {};
          const sid = createSession({
            id: data.user.id,
            email: data.user.email,
            username: meta.username || data.user.email,
            user_metadata: meta,
            access_token: data.access_token,
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

  if (pathname === '/auth/google') {
    if (!authEnabled) {
      res.writeHead(302, { Location: '/auth/login' });
      res.end();
      return;
    }
    const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
    const redirectTo = proto + '://' + req.headers.host + '/auth/callback';
    const authUrl = supabaseUrl + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(redirectTo);
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  if (pathname === '/auth/callback') {
    if (req.method === 'GET') {
      const cbPath = path.join(publicDir, 'auth', 'callback.html');
      sendFile(res, cbPath);
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', async () => {
        try {
          const { access_token } = JSON.parse(body);
          if (!access_token) throw new Error('missing token');
          const supRes = await supabaseRequest('/auth/v1/user', 'GET', null, access_token);
          const userData = supRes.body;
          if (!userData.id) throw new Error('invalid token');
          const meta = userData.user_metadata || {};
          const googleName = meta.full_name || meta.name || meta.display_name || userData.email;
          const sid = createSession({
            id: userData.id,
            email: userData.email,
            username: meta.username || googleName,
            user_metadata: meta,
            access_token,
          });
          setCookie(res, 'session_id', sid, { httpOnly: true, sameSite: 'Lax', path: '/' });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          console.error('OAuth callback error:', err);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false }));
        }
      });
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

  if (authEnabled && pathname === '/auth/update-username' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const session = getSession(req);
        if (!session) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Not authenticated' }));
          return;
        }
        const { username } = JSON.parse(body);
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid username' }));
          return;
        }
        const newUsername = username.trim();
        if (!supabaseServiceKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server' }));
          return;
        }
        const adminPath = '/auth/v1/admin/users/' + encodeURIComponent(session.user.id);
        const supRes = await supabaseRequest(adminPath, 'PATCH', JSON.stringify({ user_metadata: { username: newUsername } }), supabaseServiceKey, supabaseServiceKey);
        if (supRes.status >= 200 && supRes.status < 300) {
          session.user.username = newUsername;
          if (session.user.user_metadata) {
            session.user.user_metadata.username = newUsername;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, username: newUsername }));
        } else {
          console.error('Supabase admin error:', supRes.status, JSON.stringify(supRes.body));
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Supabase error: ' + (supRes.body.msg || supRes.body.error || 'unknown') }));
        }
      } catch (err) {
        console.error('Update username error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message || 'Internal error' }));
      }
    });
    return;
  }

  if (authEnabled && pathname === '/auth/diag') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      hasServiceKey: !!supabaseServiceKey,
      version: 'update-username-v2',
    }));
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
