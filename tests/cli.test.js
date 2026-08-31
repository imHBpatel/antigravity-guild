'use strict';

const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { enforceGitignore } = require('../lib/gitignore');

console.log('🧪 Running CLI & Idempotency End-to-End Tests...');

const cliPath = path.resolve(__dirname, '../bin/cli.js');

// 1. --version flag
{
  const out = execSync(`node "${cliPath}" --version`, { encoding: 'utf8' }).trim();
  assert(out.includes('OpenGuild v2.2.0'), `Expected v2.2.0, got ${out}`);
  console.log('  ✔ CLI --version flag verified');
}

// 2. --help flag
{
  const out = execSync(`node "${cliPath}" --help`, { encoding: 'utf8' });
  assert(out.includes('USAGE'), 'Help text must contain USAGE');
  assert(out.includes('mcp'), 'Help text must mention mcp');
  assert(out.includes('--setup-mcp'), 'Help text must mention --setup-mcp');
  assert(out.includes('--team'), 'Help text must mention --team');
  assert(out.includes('--lint-memory'), 'Help text must mention --lint-memory');
  console.log('  ✔ CLI --help flag verified');
}

// 3. --preset backend in dry-run
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-preset-'));
  const out = execSync(`node "${cliPath}" --preset backend --dry-run`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('Backend & Distributed Systems'), 'Must mention preset in output');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --preset flag verified');
}

// 4. --setup-mcp --dry-run
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-mcp-dry-'));
  const out = execSync(`node "${cliPath}" --setup-mcp all --dry-run`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('OpenGuild 1-Click MCP Configurator'), 'Must run MCP configurator');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --setup-mcp --dry-run verified');
}

// 5. --lint-memory
{
  const out = execSync(`node "${cliPath}" --lint-memory`, { encoding: 'utf8' });
  assert(out.includes('OpenGuild Memory Vault Linter'), 'Must run memory linter');
  console.log('  ✔ CLI --lint-memory verified');
}

// 6. Gitignore Idempotency proof
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-git-'));
  
  // First run: creates
  const res1 = enforceGitignore(tmpDir, false);
  assert.strictEqual(res1.created, true);

  // Second run: should be idempotent (0 added)
  const res2 = enforceGitignore(tmpDir, false);
  assert.strictEqual(res2.created, false);
  assert.strictEqual(res2.updated, false);
  assert.strictEqual(res2.addedCount, 0);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Gitignore Idempotency verified');
}

console.log('✨ All CLI End-to-End Tests Passed!\n');
