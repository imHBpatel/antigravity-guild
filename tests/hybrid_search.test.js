'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  tokenize,
  bm25Search,
  searchMemoryVaults,
} = require('../lib/hybrid_search');

console.log('🧪 Running BM25 Hybrid Memory Search Tests...');

// 1. Tokenization and stopword removal
{
  const tokens = tokenize('The authentication token is validated with RS256 for all users');
  assert(tokens.includes('authentication'));
  assert(tokens.includes('token'));
  assert(tokens.includes('validated'));
  assert(tokens.includes('rs256'));
  assert(tokens.includes('users'));
  assert(!tokens.includes('the'));
  assert(!tokens.includes('is'));
  assert(!tokens.includes('with'));
  assert(!tokens.includes('for'));
  assert(!tokens.includes('all'));
  console.log('  ✔ Tokenization and stopword filtering verified');
}

// 2. BM25 Okapi Probabilistic Ranking
{
  const docs = [
    { id: 1, text: 'Use Postgres database with proper indexing on user_id foreign keys' },
    { id: 2, text: 'Always set Content-Type header on custom fetch calls and API requests' },
    { id: 3, text: 'Postgres connection pooling should use PgBouncer for high concurrency' },
    { id: 4, text: 'Never log plaintext passwords or JWT tokens to stdout or production logs' },
  ];

  // Search for postgres
  const res = bm25Search(docs, 'Postgres connection pooling');
  assert(res.length >= 2, 'Expected at least 2 results');
  assert.strictEqual(res[0].document.id, 3, 'Document 3 should rank #1 for "Postgres connection pooling"');
  assert(res[0].relevancePercent === 100, 'Top result should have 100% relevance score');
  assert(res[1].relevancePercent < 100, 'Second result should have lower relevance score');

  // Exact phrase match bonus
  const phraseRes = bm25Search(docs, 'Content-Type header');
  assert.strictEqual(phraseRes[0].document.id, 2, 'Document 2 should match exact phrase');
  console.log('  ✔ BM25 probabilistic ranking and exact phrase bonus verified');
}

// 3. Vault Markdown Search Integration
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-search-'));

  try {
    fs.writeFileSync(path.join(tmpDir, 'test_memory.md'), `
# System Standards
- Always validate incoming webhook signatures with HMAC-SHA256
- Store all timestamps in UTC ISO format
- Use Redis for distributed rate limiting
`);

    const memoryDirs = [{ label: 'Test Vault', dir: tmpDir }];
    const searchRes = searchMemoryVaults(memoryDirs, 'webhook HMAC');

    assert(searchRes.matches.length >= 1, 'Expected at least 1 match');
    assert(searchRes.markdown.includes('HMAC-SHA256'));
    assert(searchRes.markdown.includes('Match]'));

    // Non-matching query
    const emptyRes = searchMemoryVaults(memoryDirs, 'nonexistent_keyword_xyz');
    assert.strictEqual(emptyRes.matches.length, 0);
    assert(emptyRes.markdown.includes('No relevant memory entries'));

    console.log('  ✔ searchMemoryVaults vault integration verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('✨ All BM25 Hybrid Memory Search Tests Passed!\n');
