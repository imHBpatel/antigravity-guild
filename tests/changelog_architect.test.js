'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { categorizeCommit, generateChangelog } = require('../lib/changelog_architect');

console.log('🧪 Running Git Semantic Changelog Tests...');

// 1. Commit Categorization
{
  assert.strictEqual(categorizeCommit('feat: add autonomous agent loop'), 'features');
  assert.strictEqual(categorizeCommit('fix(healer): resolve syntax error diagnosis regex'), 'fixes');
  assert.strictEqual(categorizeCommit('perf: optimize token diet by 83%'), 'performance');
  assert.strictEqual(categorizeCommit('sec: scrub webhook bearer tokens under SAIF 2.0'), 'security');
  assert.strictEqual(categorizeCommit('test: add regression test for diff engine rollback'), 'tests');
  assert.strictEqual(categorizeCommit('docs: update README with 20 superpowers table'), 'docs');
  assert.strictEqual(categorizeCommit('chore: bump engine version'), 'maintenance');
  console.log('  ✔ Commit categorization verified');
}

// 2. Full Changelog Generation
{
  const workspaceRoot = path.resolve(__dirname, '..');
  const result = generateChangelog(workspaceRoot, { version: 'v3.3.0', write: false, maxCommits: 25 });

  assert.strictEqual(result.version, 'v3.3.0');
  assert.ok(result.markdown.includes('# 📋 Changelog: [v3.3.0]'), 'Changelog markdown should contain version header');
  assert.ok(result.markdown.includes('## 🏛️ Council Release Sign-Offs'), 'Changelog should include Council sign-offs');
  assert.ok(result.totalCommits >= 0, 'Total commits count should be non-negative');
  console.log('  ✔ Full changelog synthesis verified');
}

// 3. Changelog Disk Write in Temp Dir
{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-changelog-'));
  const result = generateChangelog(tempDir, { version: 'v3.3.0', write: true });

  assert.strictEqual(result.written, true);
  assert.ok(fs.existsSync(result.outputPath), 'CHANGELOG.md should be written to disk');

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('  ✔ Changelog disk write verified');
}

console.log('✨ All Git Semantic Changelog Tests Passed!\n');
