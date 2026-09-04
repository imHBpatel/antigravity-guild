'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runStep, verifyProject } = require('../lib/verifier');

console.log('🧪 Running Deterministic Verification Gate Tests...');

// 1. runStep Tests
{
  const skipped = runStep('echo "No linter configured"', process.cwd());
  assert.strictEqual(skipped.passed, true);
  assert.strictEqual(skipped.skipped, true);

  const passed = runStep('node -e "process.exit(0)"', process.cwd());
  assert.strictEqual(passed.passed, true);
  assert.strictEqual(passed.skipped, false);

  const failed = runStep('node -e "process.exit(1)"', process.cwd());
  assert.strictEqual(failed.passed, false);
  console.log('  ✔ runStep execution and status capture verified');
}

// 2. verifyProject Pipeline Tests
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-veri-'));
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'verify-sample', scripts: { test: 'node -e "process.exit(0)"' } })
  );

  const res = verifyProject(tmpDir, { autoFix: true });
  assert.strictEqual(typeof res.passed, 'boolean');
  assert(res.reportMarkdown.includes('Deterministic Verification Proof'), 'Must include title');
  assert(res.reportMarkdown.includes('Automated Test Suite'), 'Must audit test suite');
  assert(res.reportMarkdown.includes('Context Hygiene'), 'Must audit gitignore');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ verifyProject pipeline verified');
}

console.log('✨ All Deterministic Verifier Tests Passed!\n');
