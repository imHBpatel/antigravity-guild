/**
 * OmniGuild Zero-Dependency LAN/VPN Team Brain Sync Server & Client
 *
 * Provides a lightweight HTTP service allowing team members to synchronize
 * architectural decisions, active tasks, and institutional memory across
 * local networks or VPNs without third-party cloud infrastructure.
 *
 * Pure Node.js built-ins (http, https, url). Zero external dependencies.
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { VERSION, TOOL_NAME, c } = require('./constants');
const { getGlobalMemoryPath, initMemoryHub } = require('./memory');
const { readMemoryBank } = require('./memory_bank');

/**
 * Packs local memory documents into an in-memory JSON archive.
 * @param {string} cwd
 * @returns {object}
 */
function packMemoryArchive(cwd = process.cwd()) {
  const globalMemDir = getGlobalMemoryPath();
  const teamMemDir = path.join(cwd, '.openguild');

  const archive = {
    schemaVersion: '2.0.0',
    engineVersion: VERSION,
    exportedAt: new Date().toISOString(),
    globalDocuments: {},
    teamDocuments: {}
  };

  if (fs.existsSync(globalMemDir)) {
    for (const f of fs.readdirSync(globalMemDir)) {
      const p = path.join(globalMemDir, f);
      if (fs.statSync(p).isFile()) {
        archive.globalDocuments[f] = fs.readFileSync(p, 'utf8');
      }
    }
  }

  if (fs.existsSync(teamMemDir)) {
    for (const f of fs.readdirSync(teamMemDir)) {
      const p = path.join(teamMemDir, f);
      if (fs.statSync(p).isFile()) {
        archive.teamDocuments[f] = fs.readFileSync(p, 'utf8');
      }
    }
  }

  return archive;
}

/**
 * Merges incoming archive documents into local memory vaults.
 * @param {object} archive
 * @param {string} cwd
 * @returns {{ globalCount: number, teamCount: number }}
 */
function unpackMemoryArchive(archive, cwd = process.cwd()) {
  const globalMemDir = getGlobalMemoryPath();
  const teamMemDir = path.join(cwd, '.openguild');

  initMemoryHub(false);
  if (!fs.existsSync(teamMemDir)) {
    fs.mkdirSync(teamMemDir, { recursive: true });
  }

  let globalCount = 0;
  let teamCount = 0;

  if (archive.globalDocuments) {
    for (const [fname, content] of Object.entries(archive.globalDocuments)) {
      const dest = path.join(globalMemDir, path.basename(fname));
      if (fs.existsSync(dest)) {
        const existing = fs.readFileSync(dest, 'utf8');
        const existingLines = new Set(existing.split(/\r?\n/).map(l => l.trim()));
        const incomingLines = content.split(/\r?\n/);
        const newLines = incomingLines.filter(l => l.trim() && !existingLines.has(l.trim()));
        if (newLines.length > 0) {
          fs.appendFileSync(dest, `\n\n# --- Remote Sync (${new Date().toISOString().substring(0, 10)}) ---\n` + newLines.join('\n') + '\n', 'utf8');
        }
      } else {
        fs.writeFileSync(dest, content, 'utf8');
      }
      globalCount++;
    }
  }

  if (archive.teamDocuments) {
    for (const [fname, content] of Object.entries(archive.teamDocuments)) {
      const dest = path.join(teamMemDir, path.basename(fname));
      if (fs.existsSync(dest)) {
        const existing = fs.readFileSync(dest, 'utf8');
        const existingLines = new Set(existing.split(/\r?\n/).map(l => l.trim()));
        const incomingLines = content.split(/\r?\n/);
        const newLines = incomingLines.filter(l => l.trim() && !existingLines.has(l.trim()));
        if (newLines.length > 0) {
          fs.appendFileSync(dest, `\n\n# --- Remote Sync (${new Date().toISOString().substring(0, 10)}) ---\n` + newLines.join('\n') + '\n', 'utf8');
        }
      } else {
        fs.writeFileSync(dest, content, 'utf8');
      }
      teamCount++;
    }
  }

  return { globalCount, teamCount };
}

/**
 * Creates the HTTP sync server.
 * @param {object} options
 * @returns {http.Server}
 */
function createSyncServer(options = {}) {
  const cwd = options.cwd || process.cwd();

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', tool: TOOL_NAME, version: VERSION }));
      return;
    }

    if (req.method === 'GET' && pathname === '/api/status') {
      const bank = readMemoryBank(cwd);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        tool: TOOL_NAME,
        version: VERSION,
        activeTask: bank.activeTask || 'None',
        projectName: path.basename(cwd)
      }));
      return;
    }

    if (req.method === 'GET' && pathname === '/api/memory') {
      const archive = packMemoryArchive(cwd);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(archive, null, 2));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/memory') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const incomingArchive = JSON.parse(body);
          const result = unpackMemoryArchive(incomingArchive, cwd);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Memory synced successfully', ...result }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });

  return server;
}

/**
 * Starts the sync server on a given port.
 * @param {object} options
 * @returns {Promise<{ server: http.Server, port: number, url: string, close: Function }>}
 */
function startSyncServer(options = {}) {
  const port = options.port || 4545;
  const server = createSyncServer(options);

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      resolve({
        server,
        port,
        url,
        close: () => new Promise(r => server.close(r))
      });
    });

    server.on('error', err => {
      reject(err);
    });
  });
}

/**
 * Client: Pulls memory from a remote OmniGuild sync server.
 * @param {string} remoteUrl
 * @param {object} options
 * @returns {Promise<object>}
 */
function pullFromRemote(remoteUrl, options = {}) {
  const cwd = options.cwd || process.cwd();
  const targetUrl = remoteUrl.replace(/\/$/, '') + '/api/memory';
  const isHttps = targetUrl.startsWith('https');
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    client.get(targetUrl, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Remote server responded with status: ${res.statusCode}`));
      }
      let rawData = '';
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        try {
          const archive = JSON.parse(rawData);
          const result = unpackMemoryArchive(archive, cwd);
          resolve({ success: true, ...result });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', err => reject(err));
  });
}

/**
 * Client: Pushes local memory to a remote OmniGuild sync server.
 * @param {string} remoteUrl
 * @param {object} options
 * @returns {Promise<object>}
 */
function pushToRemote(remoteUrl, options = {}) {
  const cwd = options.cwd || process.cwd();
  const targetUrl = remoteUrl.replace(/\/$/, '') + '/api/memory';
  const archive = packMemoryArchive(cwd);
  const data = JSON.stringify(archive);

  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === 'https:';
  const client = isHttps ? https : http;

  const reqOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = client.request(reqOptions, res => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsedRes = JSON.parse(responseBody);
          resolve(parsedRes);
        } catch {
          resolve({ success: res.statusCode === 200, status: res.statusCode });
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(data);
    req.end();
  });
}

module.exports = {
  packMemoryArchive,
  unpackMemoryArchive,
  createSyncServer,
  startSyncServer,
  pullFromRemote,
  pushToRemote
};
