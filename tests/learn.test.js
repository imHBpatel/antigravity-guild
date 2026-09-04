'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { scrubSecrets, inferCategory, recordLesson } = require('../lib/learn');

console.log('🧪 Running Autonomous Learning Engine Tests...');

// 1. Secret Scrubbing Tests
{
  const awsSample = 'Configured S3 with access key AKIAIOSFODNN7EXAMPLE for backups.';
  const res1 = scrubSecrets(awsSample);
  assert.strictEqual(res1.scrubbed, true, 'Should detect and scrub AWS key');
  assert.strictEqual(res1.sanitized.includes('AKIAIOSFODNN7EXAMPLE'), false, 'AWS key must be removed');
  assert.strictEqual(res1.sanitized.includes('[REDACTED_SECRET]'), true, 'Should replace with [REDACTED_SECRET]');

  const ghSample = 'Deployed webhook with token ghp_1234567890abcdefghijklmnopqrstuvwx.';
  const res2 = scrubSecrets(ghSample);
  assert.strictEqual(res2.scrubbed, true, 'Should detect and scrub GitHub token');
  assert.strictEqual(res2.sanitized.includes('ghp_1234567890'), false, 'GitHub token must be removed');

  const cleanSample = 'Use connection pooling with max 20 connections for PostgreSQL.';
  const res3 = scrubSecrets(cleanSample);
  assert.strictEqual(res3.scrubbed, false, 'Clean text should not flag scrubbed');
  assert.strictEqual(res3.sanitized, cleanSample, 'Clean text should be unchanged');
  console.log('  ✔ Secret scrubbing logic verified');
}

// 2. Category Inference Tests
{
  assert.strictEqual(inferCategory('Fixed authentication JWT expiration vulnerability'), 'SECURITY');
  assert.strictEqual(inferCategory('Reduced database query latency by adding composite index'), 'PERFORMANCE');
  assert.strictEqual(inferCategory('Refactored domain boundaries and schema model'), 'ARCHITECTURE');
  assert.strictEqual(inferCategory('Fixed null pointer exception on user logout crash'), 'BUGFIX');
  assert.strictEqual(inferCategory('Added unit tests for deterministic invariants'), 'INVARIANTS');
  assert.strictEqual(inferCategory('Adjusted padding and responsive CSS grid layout'), 'UI-UX');
  console.log('  ✔ Category inference verified');
}

// 3. Memory Writing & Deduplication Tests
{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-learn-'));
  const tempFile = 'custom_learn_test.md';

  // First write (team scope in tempDir)
  const res1 = recordLesson('Always use prepared statements to prevent SQL injection.', {
    scope: 'team',
    category: 'SECURITY',
    tags: ['sql', 'postgres'],
    projectDir: tempDir,
    customFile: tempFile,
  });

  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.isDuplicate, false);
  const content1 = fs.readFileSync(res1.filePath, 'utf8');
  assert.strictEqual(content1.includes('**[SECURITY]** [#sql #postgres] Always use prepared statements'), true);

  // Duplicate write should be caught
  const res2 = recordLesson('Always use prepared statements to prevent SQL injection.', {
    scope: 'team',
    projectDir: tempDir,
    customFile: tempFile,
  });

  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.isDuplicate, true, 'Duplicate entry should be detected and skipped');

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('  ✔ Record lesson and deduplication verified');
}

console.log('✨ All Learning Engine Tests Passed!\n');
