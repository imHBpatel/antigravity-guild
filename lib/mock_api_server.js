/**
 * Superpower 34: API Mock Server Generator
 * 
 * Inspired by Mockoon, WireMock, Mokapi.
 * Scans codebase for HTTP client calls (fetch, axios, http.request),
 * infers API shapes, and generates a local mock server using
 * Node.js native http module.
 * 
 * Zero external dependencies — pure Node.js built-ins only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

// ── API Call Detection ─────────────────────────────────────────────────
/**
 * Scan source files for HTTP client calls and extract API patterns.
 */
function scanForApiCalls(projectRoot) {
  const apiCalls = [];
  const sourceFiles = collectSourceFiles(projectRoot);

  for (const filePath of sourceFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.relative(projectRoot, filePath);
      
      // fetch('url', { method: ... })
      const fetchCalls = extractFetchCalls(content, fileName);
      apiCalls.push(...fetchCalls);

      // axios.get/post/put/delete('url')
      const axiosCalls = extractAxiosCalls(content, fileName);
      apiCalls.push(...axiosCalls);

      // http.request / https.request
      const httpCalls = extractHttpCalls(content, fileName);
      apiCalls.push(...httpCalls);
    } catch (_) { /* skip */ }
  }

  // Deduplicate by URL + method
  const seen = new Set();
  return apiCalls.filter(call => {
    const key = `${call.method}:${call.urlPattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract fetch() API calls.
 */
function extractFetchCalls(code, fileName) {
  const calls = [];
  
  // fetch('url') or fetch(`url`)
  const fetchPattern = /fetch\s*\(\s*[`'"]([^`'"]+)[`'"]\s*(?:,\s*\{([^}]*)\})?\s*\)/g;
  let match;
  while ((match = fetchPattern.exec(code)) !== null) {
    const url = match[1];
    const options = match[2] || '';
    const methodMatch = options.match(/method\s*:\s*['"](\w+)['"]/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';

    calls.push({
      type: 'fetch',
      url,
      urlPattern: urlToPattern(url),
      method,
      sourceFile: fileName,
    });
  }

  // fetch(baseUrl + '/path') or fetch(`${baseUrl}/path`)
  const templateFetch = /fetch\s*\(\s*`([^`]+)`/g;
  while ((match = templateFetch.exec(code)) !== null) {
    const template = match[1];
    const urlPattern = template.replace(/\$\{[^}]+\}/g, ':param');
    calls.push({
      type: 'fetch',
      url: template,
      urlPattern: urlToPattern(urlPattern),
      method: 'GET',
      sourceFile: fileName,
    });
  }

  return calls;
}

/**
 * Extract axios API calls.
 */
function extractAxiosCalls(code, fileName) {
  const calls = [];

  // axios.get/post/put/delete/patch('url')
  const axiosPattern = /axios\.(get|post|put|delete|patch)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi;
  let match;
  while ((match = axiosPattern.exec(code)) !== null) {
    calls.push({
      type: 'axios',
      url: match[2],
      urlPattern: urlToPattern(match[2]),
      method: match[1].toUpperCase(),
      sourceFile: fileName,
    });
  }

  // axios({ url: '...', method: '...' })
  const axiosObjPattern = /axios\s*\(\s*\{[^}]*url\s*:\s*['"]([^'"]+)['"][^}]*method\s*:\s*['"](\w+)['"]/gi;
  while ((match = axiosObjPattern.exec(code)) !== null) {
    calls.push({
      type: 'axios',
      url: match[1],
      urlPattern: urlToPattern(match[1]),
      method: match[2].toUpperCase(),
      sourceFile: fileName,
    });
  }

  return calls;
}

/**
 * Extract http.request calls.
 */
function extractHttpCalls(code, fileName) {
  const calls = [];

  // http.request({ hostname, path, method })
  const httpPattern = /https?\.request\s*\(\s*\{[^}]*path\s*:\s*['"]([^'"]+)['"][^}]*(?:method\s*:\s*['"](\w+)['"])?/gi;
  let match;
  while ((match = httpPattern.exec(code)) !== null) {
    calls.push({
      type: 'http',
      url: match[1],
      urlPattern: urlToPattern(match[1]),
      method: (match[2] || 'GET').toUpperCase(),
      sourceFile: fileName,
    });
  }

  return calls;
}

/**
 * Convert a URL to a route pattern.
 * "/api/users/123" → "/api/users/:id"
 * "https://api.example.com/v1/items" → "/v1/items"
 */
function urlToPattern(url) {
  // Strip protocol and host
  let pattern = url.replace(/^https?:\/\/[^/]+/, '');
  if (!pattern.startsWith('/')) pattern = '/' + pattern;

  // Replace UUIDs with :id
  pattern = pattern.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
  // Replace numeric IDs with :id
  pattern = pattern.replace(/\/\d+(?=\/|$)/g, '/:id');
  // Replace template variables
  pattern = pattern.replace(/\$\{[^}]+\}/g, ':param');
  // Remove query strings
  pattern = pattern.replace(/\?.*$/, '');

  return pattern;
}

// ── Mock Response Generation ───────────────────────────────────────────
/**
 * Generate mock response data based on URL pattern and method.
 * Accepts either an apiCall object ({ method, urlPattern }) or (method, urlPattern).
 */
function generateMockResponse(apiCallOrMethod, maybeUrlPattern) {
  let method = 'GET';
  let urlPattern = '/';

  if (typeof apiCallOrMethod === 'string') {
    method = apiCallOrMethod;
    urlPattern = maybeUrlPattern || '/';
  } else if (apiCallOrMethod && typeof apiCallOrMethod === 'object') {
    method = apiCallOrMethod.method || 'GET';
    urlPattern = apiCallOrMethod.urlPattern || apiCallOrMethod.url || '/';
  }

  // Infer resource name from URL pattern
  const segments = (urlPattern || '/').split('/').filter(s => s && !s.startsWith(':'));
  const resource = segments[segments.length - 1] || 'item';
  const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource;

  const isSingle = (urlPattern && urlPattern.includes(':id')) ||
    /\/\d+$/.test(urlPattern || '') ||
    /\/[a-f0-9-]{8,}$/i.test(urlPattern || '');

  let result;
  switch (method.toUpperCase()) {
    case 'GET':
      if (isSingle) {
        // Single resource
        const item = generateSingleResource(singular);
        result = {
          statusCode: 200,
          body: item,
          ...item,
        };
      } else {
        // List of resources
        const list = [generateSingleResource(singular), generateSingleResource(singular)];
        result = {
          statusCode: 200,
          body: {
            data: list,
            total: 2,
            page: 1,
            limit: 20,
          },
          data: list,
          total: 2,
        };
      }
      break;
    case 'POST': {
      const item = generateSingleResource(singular);
      result = {
        statusCode: 201,
        body: {
          ...item,
          message: `${singular} created successfully`,
        },
        ...item,
        message: `${singular} created successfully`,
        success: true,
      };
      break;
    }
    case 'PUT':
    case 'PATCH': {
      const item = generateSingleResource(singular);
      result = {
        statusCode: 200,
        body: {
          ...item,
          message: `${singular} updated successfully`,
        },
        ...item,
        message: `${singular} updated successfully`,
        success: true,
      };
      break;
    }
    case 'DELETE':
      result = {
        statusCode: 200,
        body: { message: `${singular} deleted successfully`, deleted: true },
        message: `${singular} deleted successfully`,
        deleted: true,
        success: true,
      };
      break;
    default:
      result = {
        statusCode: 200,
        body: { status: 'ok' },
        status: 'ok',
        success: true,
      };
      break;
  }
  return result;
}

/**
 * Generate a single mock resource object.
 */
function generateSingleResource(name) {
  const id = Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  
  return {
    id,
    name: `Mock ${name} ${id.substring(0, 4)}`,
    createdAt: now,
    updatedAt: now,
    status: 'active',
  };
}

// ── Mock Server ────────────────────────────────────────────────────────
/**
 * Create and start a mock API server.
 * @param {Array} apiCalls — detected API call patterns
 * @param {number} port — port to listen on
 * @param {string} mocksDir — directory for custom mock overrides
 * @returns {http.Server}
 */
function createMockServer(apiCalls, port = 4322, mocksDir = null) {
  // Build route table
  const routes = new Map();

  // Load custom mocks from .openguild/mocks/ if available
  const customMocks = mocksDir ? loadCustomMocks(mocksDir) : {};

  for (const call of apiCalls) {
    const key = `${call.method}:${call.urlPattern}`;
    const customMock = customMocks[key];
    const response = customMock || generateMockResponse(call);
    routes.set(key, { ...call, response });
  }

  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Mock-Server', 'OmniGuild');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const method = req.method;
    const urlPath = new URL(req.url, `http://localhost:${port}`).pathname;

    // Try exact match first
    let route = routes.get(`${method}:${urlPath}`);

    // Try pattern matching
    if (!route) {
      for (const [key, r] of routes) {
        if (r.method !== method) continue;
        if (matchPattern(r.urlPattern, urlPath)) {
          route = r;
          break;
        }
      }
    }

    if (route) {
      res.writeHead(route.response.statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(route.response.body, null, 2));
    } else {
      // Return 404 with available routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Route not found',
        path: urlPath,
        method,
        availableRoutes: Array.from(routes.keys()),
      }, null, 2));
    }
  });

  return { server, routes: Array.from(routes.values()), routeMap: routes, port };
}

/**
 * Match a URL pattern against an actual path.
 * "/api/users/:id" matches "/api/users/123"
 */
function matchPattern(pattern, actual) {
  const patternParts = pattern.split('/');
  const actualParts = actual.split('/');
  
  if (patternParts.length !== actualParts.length) return false;

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) continue; // Wildcard
    if (patternParts[i] !== actualParts[i]) return false;
  }

  return true;
}

/**
 * Load custom mock definitions from .openguild/mocks/ directory.
 */
function loadCustomMocks(mocksDir) {
  const mocks = {};
  if (!fs.existsSync(mocksDir)) return mocks;

  try {
    const files = fs.readdirSync(mocksDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = JSON.parse(fs.readFileSync(path.join(mocksDir, file), 'utf8'));
        if (content.method && content.path) {
          const key = `${content.method.toUpperCase()}:${content.path}`;
          mocks[key] = {
            statusCode: content.statusCode || 200,
            body: content.body || {},
          };
        }
      } catch (_) { /* skip invalid */ }
    }
  } catch (_) { /* skip */ }

  return mocks;
}

// ── Source File Collection ─────────────────────────────────────────────
function collectSourceFiles(dir, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return [];
  const files = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor', 'tests', 'test', '__tests__']);

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.has(entry.name) || (entry.isDirectory() && entry.name.startsWith('.'))) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectSourceFiles(fullPath, maxDepth, depth + 1));
      } else if (/\.(js|ts|jsx|tsx|mjs|cjs)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (_) { /* skip */ }
  return files;
}

// ── Report Formatting ──────────────────────────────────────────────────
/**
 * Format the mock server setup report.
 */
function formatMockReport(apiCalls, port) {
  const lines = [];

  lines.push('# 🧪 OmniGuild API Mock Server');
  lines.push('');
  lines.push(`> Server: \`http://localhost:${port}\``);
  lines.push(`> Detected API Calls: **${apiCalls.length}**`);
  lines.push('');

  if (apiCalls.length === 0) {
    lines.push('No HTTP client calls detected in the codebase.');
    lines.push('');
    lines.push('The scanner looks for: `fetch()`, `axios.*()`, `http.request()`');
    return lines.join('\n');
  }

  // Group by method
  const byMethod = {};
  for (const call of apiCalls) {
    if (!byMethod[call.method]) byMethod[call.method] = [];
    byMethod[call.method].push(call);
  }

  lines.push('## Mocked Endpoints');
  lines.push('| Method | Route | Source |');
  lines.push('|:---:|:---|:---|');
  for (const call of apiCalls) {
    lines.push(`| \`${call.method}\` | \`${call.urlPattern}\` | \`${call.sourceFile}\` |`);
  }
  lines.push('');

  lines.push('## Usage');
  lines.push('```bash');
  lines.push(`# Start the mock server`);
  lines.push(`npx omniguild --mock-api`);
  lines.push('');
  lines.push(`# Test against it`);
  lines.push(`curl http://localhost:${port}${apiCalls[0]?.urlPattern || '/api/test'}`);
  lines.push('```');
  lines.push('');

  lines.push('## Custom Mocks');
  lines.push('Create JSON files in `.openguild/mocks/` to override defaults:');
  lines.push('```json');
  lines.push(JSON.stringify({
    method: 'GET',
    path: '/api/example',
    statusCode: 200,
    body: { custom: 'response' },
  }, null, 2));
  lines.push('```');

  return lines.join('\n');
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Run the mock API server generator.
 * @param {string} projectRoot — project directory
 * @param {object} options — { port, start }
 */
function runMockApi(projectRoot, options = {}) {
  const port = options.port || 4322;
  const mocksDir = path.join(projectRoot, '.openguild', 'mocks');

  // Scan for API calls
  const apiCalls = scanForApiCalls(projectRoot);
  const report = formatMockReport(apiCalls, port);

  if (options.start !== false && apiCalls.length > 0) {
    const { server, routes } = createMockServer(apiCalls, port, mocksDir);

    return {
      report,
      apiCalls,
      server,
      routes,
      port,
      start: () => new Promise((resolve) => {
        server.listen(port, () => {
          resolve(`Mock server running on http://localhost:${port}`);
        });
      }),
    };
  }

  return { report, apiCalls, port };
}

module.exports = {
  runMockApi,
  scanForApiCalls,
  createMockServer,
  generateMockResponse,
  extractFetchCalls,
  extractAxiosCalls,
  extractHttpCalls,
  urlToPattern,
  matchPattern,
  formatMockReport,
};
