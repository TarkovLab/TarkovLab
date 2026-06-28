const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

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
      'Cache-Control': (ext === '.html' || ext === '.js') ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  // Redirect legacy .html URLs to clean, extensionless paths (301).
  if (pathname.endsWith('.html')) {
    const clean = pathname === '/index.html'
      ? '/'
      : pathname.slice(0, -'.html'.length);
    res.writeHead(301, { Location: clean + requestUrl.search });
    res.end();
    return;
  }

  // Root serves the quests homepage.
  if (pathname === '/') {
    pathname = '/index.html';
  }

  let filePath = path.join(publicDir, pathname);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  // Clean URL with no extension (e.g. /achievements) -> resolve to .html file.
  if (!path.extname(filePath)) {
    const asHtml = filePath + '.html';
    if (fs.existsSync(asHtml)) {
      filePath = asHtml;
    }
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log(`TarkovLab running on http://localhost:${port}`);
});
