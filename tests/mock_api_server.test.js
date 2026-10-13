'use strict';
const assert = require('assert');
const path = require('path');
const {
  extractFetchCalls,
  extractAxiosCalls,
  extractHttpCalls,
  urlToPattern,
  matchPattern,
  generateMockResponse,
  createMockServer,
  runMockApi,
} = require('../lib/mock_api_server');

console.log('  ⏱ mock_api_server.test.js');

// Test 1: extractFetchCalls
const fetchSnippet = `
  const res = await fetch('/api/users', { method: 'POST' });
  const data = await fetch('/api/products/123');
`;
const fetchCalls = extractFetchCalls(fetchSnippet, 'sample.js');
assert(fetchCalls.length >= 2, 'Should extract both fetch calls');
assert(fetchCalls.some(c => c.method === 'POST' && c.url.includes('/api/users')), 'Should detect POST /api/users');
assert(fetchCalls.some(c => c.method === 'GET' && c.url.includes('/api/products/123')), 'Should detect GET /api/products/123');

// Test 2: extractAxiosCalls
const axiosSnippet = `
  axios.get('/api/orders?status=active');
  axios.post('/api/auth/login', { user, pass });
  axios.delete('/api/items/456');
`;
const axiosCalls = extractAxiosCalls(axiosSnippet, 'api.js');
assert(axiosCalls.length === 3, 'Should extract 3 axios calls');
assert(axiosCalls.some(c => c.method === 'GET' && c.url.includes('/api/orders')), 'Should detect axios GET');
assert(axiosCalls.some(c => c.method === 'POST' && c.url.includes('/api/auth/login')), 'Should detect axios POST');
assert(axiosCalls.some(c => c.method === 'DELETE' && c.url.includes('/api/items/456')), 'Should detect axios DELETE');

// Test 3: extractHttpCalls
const httpSnippet = `
  const req = http.request({ path: '/api/v1/health', method: 'GET' }, callback);
  https.get('https://example.com/status', cb);
`;
const httpCalls = extractHttpCalls(httpSnippet, 'service.js');
assert(httpCalls.length >= 1, 'Should extract http calls');

// Test 4: urlToPattern & matchPattern
const pattern1 = urlToPattern('/api/users/123');
assert(pattern1.includes(':id') || pattern1.includes(':param'), 'Numeric segments should become params: ' + pattern1);
const matched = matchPattern('/api/users/456', pattern1);
assert(matched !== null, 'Pattern should match url with param');

// Test 5: generateMockResponse
const mockUser = generateMockResponse('GET', '/api/users/123');
assert(typeof mockUser === 'object' && mockUser !== null, 'Should return an object');
assert(mockUser.data !== undefined || mockUser.id !== undefined || mockUser.success !== undefined, 'Should have mock payload fields');

// Test 6: createMockServer returns server and routes
const serverObj = createMockServer([
  { method: 'GET', url: '/api/hello', urlPattern: '/api/hello', file: 'test.js' }
], 9999);
assert(serverObj.server, 'Should create http server');
assert(Array.isArray(serverObj.routes), 'Should return route list');

// Test 7: runMockApi with start: false
const projectRoot = path.resolve(__dirname, '..');
const result = runMockApi(projectRoot, { start: false });
assert(result.report, 'Should generate report');
assert(Array.isArray(result.apiCalls), 'Should return apiCalls array');

console.log('  \x1b[32m✔ mock_api_server.test.js passed\x1b[0m');
