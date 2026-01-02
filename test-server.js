// Simple HTTP server for testing multiple clients
// Run with: node test-server.js [PORT]
// Example: node test-server.js 5500

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.argv[2] || 5500;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Handle root path
  let filePath = req.url === '/' ? '/index.html' : req.url;

  // Remove query string
  filePath = filePath.split('?')[0];

  // Construct full file path
  const fullPath = join(__dirname, filePath);

  try {
    const data = await readFile(fullPath);
    const ext = extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n🎮 Wordle for Friends Test Client`);
  console.log(`📡 Server running at http://localhost:${PORT}`);
  console.log(`🔗 Open in browser: http://localhost:${PORT}\n`);
  console.log(`To test multiplayer:`);
  console.log(`  1. Open http://localhost:${PORT} in one browser window`);
  console.log(`  2. Run another instance on a different port (e.g., node test-server.js ${parseInt(PORT) + 1})`);
  console.log(`  3. Open http://localhost:${parseInt(PORT) + 1} in another window\n`);
});
