'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exportMemory, importMemory } = require('../lib/sync');
const { installPreCommitHook } = require('../lib/hooks');

console.log('🧪 Running Memory Sync & Git Hooks Tests...');

// 1. Export Memory to JSON
{
  const tmpFile = path.join(os.tmpdir(), `openguild-export-${Date.now()}.json`);
  const exportedPath = exportMemory(tmpFile);

  assert(fs.existsSync(exportedPath), 'Export file must exist');
  const raw = fs.readFileSync(exportedPath, 'utf8');
  const archive = JSON.parse(raw);

  assert.strictEqual(archive.schemaVersion, '2.0.0');
  assert(archive.documents['security_standards.md'], 'Must include security standards');
  assert(archive.documents['institutional_memory.md'], 'Must include institutional memory');

  // 2. Import Memory from JSON
  const count = importMemory(exportedPath, false);
  assert(count > 0, 'Must import documents');

  fs.unlinkSync(exportedPath);
  console.log('  ✔ Memory export and import verified');
}

// 3. Git Pre-Commit Hook Installation
{
  const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-hook-'));
  fs.mkdirSync(path.join(tmpProject, '.git'));
  fs.writeFileSync(path.join(tmpProject, 'package.json'), JSON.stringify({ name: 'hook-test', scripts: { test: 'jest' } }));

  const installed = installPreCommitHook(tmpProject);
  assert.strictEqual(installed, true);

  const hookFile = path.join(tmpProject, '.git', 'hooks', 'pre-commit');
  assert(fs.existsSync(hookFile), 'Hook script must exist');
  const hookContent = fs.readFileSync(hookFile, 'utf8');
  assert(hookContent.includes('npm test'), 'Must enforce test invariant');

  fs.rmSync(tmpProject, { recursive: true, force: true });
  console.log('  ✔ Pre-commit hook installation verified');
}

console.log('✨ All Sync & Hooks Tests Passed!\n');
