const assert = require('assert');
const http = require('http');
const { getDashboardHtml, startDashboard } = require('../lib/dashboard');

console.log('🧪 Running Web Visualizer & Dashboard Tests...');

// 1. getDashboardHtml verification
{
  const html = getDashboardHtml();
  assert(html.includes('<!DOCTYPE html>'));
  assert(html.includes('OmniGuild'));
  assert(html.includes('16-Mind Supreme Council'));
  assert(html.includes('BM25 Probabilistic Memory Search'));
  assert(html.includes('Token-Dense AST Symbol Repo-Map'));
  console.log('  ✔ getDashboardHtml contains complete dark-mode interface markup');
}

// 2. HTTP Server Endpoints
(async () => {
  const dash = await startDashboard({
    port: 54321,
    openBrowser: false,
    cwd: process.cwd()
  });

  const server = dash.server;
  const port = dash.port;

  function httpGet(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}${path}`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
      }).on('error', reject);
    });
  }

  try {
    // Test HTML root
    const rootRes = await httpGet('/');
    assert.strictEqual(rootRes.statusCode, 200);
    assert(rootRes.headers['content-type'].includes('text/html'));
    assert(rootRes.body.includes('OmniGuild'));
    console.log('  ✔ GET / serves HTML SPA');

    // Test /api/status
    const statusRes = await httpGet('/api/status');
    assert.strictEqual(statusRes.statusCode, 200);
    const statusData = JSON.parse(statusRes.body);
    assert.strictEqual(statusData.version, '3.1.0');
    assert(statusData.stack !== undefined);
    assert(statusData.vault !== undefined);
    console.log('  ✔ GET /api/status returns JSON project metadata');

    // Test /api/search
    const searchRes = await httpGet('/api/search?q=auth');
    assert.strictEqual(searchRes.statusCode, 200);
    const searchData = JSON.parse(searchRes.body);
    assert.strictEqual(searchData.query, 'auth');
    assert(Array.isArray(searchData.results));
    console.log('  ✔ GET /api/search executes BM25 query and returns JSON');

  } finally {
    server.close();
  }

  console.log('✨ All Web Visualizer & Dashboard Tests Passed!\n');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
