'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { lintMemoryFile } = require('../lib/memory_linter');

console.log('🧪 Running Memory Linter & Deduplication Tests...');

// 1. Detect duplicates and autofix
{
  const tmpFile = path.join(os.tmpdir(), `test-lint-${Date.now()}.md`);
  const rawMemory = `# Institutional Memory
- Store timestamps in UTC format.
- Always implement graceful offline-first handling.
- Store timestamps in UTC format.
- Always implement graceful offline-first handling.
- Use descriptive variable names.
`;
  fs.writeFileSync(tmpFile, rawMemory, 'utf8');

  // Check without fix
  const report1 = lintMemoryFile(tmpFile, false);
  assert.strictEqual(report1.duplicates, 2, 'Should detect 2 duplicate bullet points');
  assert.strictEqual(report1.fixed, false);

  // Check with fix
  const report2 = lintMemoryFile(tmpFile, true);
  assert.strictEqual(report2.duplicates, 2);
  assert.strictEqual(report2.fixed, true);

  // Verify file on disk is clean
  const report3 = lintMemoryFile(tmpFile, false);
  assert.strictEqual(report3.duplicates, 0, 'Should have 0 duplicates after fix');

  fs.unlinkSync(tmpFile);
  console.log('  ✔ Duplicate detection and autofix passed');
}

console.log('✨ All Memory Linter Tests Passed!\n');
