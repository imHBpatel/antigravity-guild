'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateCiWorkflow, buildWorkflowYaml } = require('../lib/ci');

console.log('🧪 Running CI/CD Council Reviewer Generator Tests...');

// 1. Dry Run Verification
{
  const res = generateCiWorkflow(process.cwd(), true);
  assert.strictEqual(res.isDryRun, true);
  assert.strictEqual(typeof res.content, 'string');
  assert.strictEqual(res.content.includes('Deterministic Verification & Invariant Proofs'), true);
  assert.strictEqual(res.content.includes('council-invariants'), true);
  console.log('  ✔ CI workflow dry-run verified');
}

// 2. Real Directory Generation Verification
{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-ci-'));

  // Place mock package.json to simulate Node stack
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify({ name: 'mock-app', scripts: { test: 'jest' } }),
    'utf8'
  );

  const res1 = generateCiWorkflow(tempDir, false);
  assert.strictEqual(res1.created, true, 'Workflow file should be created');
  assert.strictEqual(fs.existsSync(res1.path), true, 'File should exist on disk');

  const fileContent = fs.readFileSync(res1.path, 'utf8');
  assert.strictEqual(fileContent.includes(path.basename(tempDir)), true, 'Should contain project name');
  assert.strictEqual(fileContent.includes('npm test'), true, 'Should include detected test command');

  // Idempotent update
  const res2 = generateCiWorkflow(tempDir, false);
  assert.strictEqual(res2.updated, true, 'Subsequent run should update existing file');

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('  ✔ Workflow disk creation and stack invariant injection verified');
}

console.log('✨ All CI/CD Workflow Generator Tests Passed!\n');
