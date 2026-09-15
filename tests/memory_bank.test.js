'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  initMemoryBank,
  readMemoryBank,
  updateActiveTask,
} = require('../lib/memory_bank');

console.log('🧪 Running Living Memory Bank Unit Tests...');

// 1. Initialization and Scaffolding
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-bank-'));

  try {
    const res = initMemoryBank(tmpDir, false);
    assert.strictEqual(res.createdFiles.length, 3, 'Expected 3 files created');
    assert(fs.existsSync(path.join(tmpDir, '.openguild', 'active_task.md')));
    assert(fs.existsSync(path.join(tmpDir, '.openguild', 'system_patterns.md')));
    assert(fs.existsSync(path.join(tmpDir, '.openguild', 'decision_log.md')));

    // Second initialization should be idempotent
    const resIdempotent = initMemoryBank(tmpDir, false);
    assert.strictEqual(resIdempotent.createdFiles.length, 0, 'No files should be re-created');
    assert.strictEqual(resIdempotent.existingFiles.length, 3, 'All 3 files should exist');

    console.log('  ✔ Memory bank initialization & idempotency verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 2. Reading Memory Bank (Aggregated & Specific)
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-bank-'));

  try {
    initMemoryBank(tmpDir, false);

    // Read single file
    const activeTask = readMemoryBank(tmpDir, 'active_task.md');
    assert(activeTask.exists, 'active_task.md should exist');
    assert(activeTask.text.includes('Current Goal:'), 'Should contain current goal');

    // Read full aggregated bank
    const fullBank = readMemoryBank(tmpDir);
    assert(fullBank.exists, 'Aggregated bank should exist');
    assert(fullBank.text.includes('active_task.md'), 'Aggregated should list active_task.md');
    assert(fullBank.text.includes('system_patterns.md'), 'Aggregated should list system_patterns.md');
    assert(fullBank.text.includes('decision_log.md'), 'Aggregated should list decision_log.md');

    console.log('  ✔ Memory bank reading (single & aggregated) verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 3. Updating Active Task Context
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-bank-'));

  try {
    initMemoryBank(tmpDir, false);

    const updateRes = updateActiveTask(tmpDir, {
      goal: 'Implement AST Symbol Repo-Map',
      status: 'in_progress',
      constraints: ['Pure Node.js', 'Zero external dependencies'],
      nextSteps: ['Write parsers', 'Add MCP handlers', 'Verify tests'],
      notes: 'Initial regex patterns completed with high accuracy.',
    });

    assert(updateRes.success, 'Update should succeed');
    assert(updateRes.updatedContent.includes('Implement AST Symbol Repo-Map'));
    assert(updateRes.updatedContent.includes('**Status:** in_progress'));
    assert(updateRes.updatedContent.includes('Pure Node.js'));
    assert(updateRes.updatedContent.includes('Write parsers'));
    assert(updateRes.updatedContent.includes('Initial regex patterns completed'));

    // Verify written to disk
    const diskContent = fs.readFileSync(path.join(tmpDir, '.openguild', 'active_task.md'), 'utf8');
    assert(diskContent.includes('Implement AST Symbol Repo-Map'));
    assert(diskContent.includes('Initial regex patterns completed'));

    console.log('  ✔ updateActiveTask surgical updates verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('✨ All Living Memory Bank Tests Passed!\n');
