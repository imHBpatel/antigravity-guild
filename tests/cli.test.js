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
  assert(out.includes('OpenGuild v2.5.0'), `Expected v2.5.0, got ${out}`);
  console.log('  ✔ CLI --version flag verified');
}

// 2. --help flag
{
  const out = execSync(`node "${cliPath}" --help`, { encoding: 'utf8' });
  assert(out.includes('USAGE'), 'Help text must contain USAGE');
  assert(out.includes('mcp'), 'Help text must mention mcp');
  assert(out.includes('--setup-mcp'), 'Help text must mention --setup-mcp');
  assert(out.includes('--analyze'), 'Help text must mention --analyze');
  assert(out.includes('--setup-ci'), 'Help text must mention --setup-ci');
  assert(out.includes('--learn'), 'Help text must mention --learn');
  assert(out.includes('--team'), 'Help text must mention --team');
  assert(out.includes('--lint-memory'), 'Help text must mention --lint-memory');
  assert(out.includes('--tokens'), 'Help text must mention --tokens');
  assert(out.includes('--verify'), 'Help text must mention --verify');
  assert(out.includes('--audit'), 'Help text must mention --audit');
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

// 7. --setup-ci --dry-run
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-ci-cli-'));
  const out = execSync(`node "${cliPath}" --setup-ci --dry-run`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('DRY RUN'), 'Must output dry run banner');
  assert(out.includes('council-invariants'), 'Must contain council invariants job');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --setup-ci --dry-run verified');
}

// 8. --learn flag with team scope
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-learn-cli-'));
  const out = execSync(`node "${cliPath}" --learn "Always set Content-Type header on API requests" --category architecture --team`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('Learned'), 'Must confirm lesson learned');
  assert(fs.existsSync(path.join(tmpDir, '.openguild', 'team_memory.md')), 'Must write to team memory file');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --learn flag verified');
}

// 9. --preset agi in dry-run
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-agi-'));
  const out = execSync(`node "${cliPath}" --preset agi --dry-run`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('AGI & Autonomous Cognitive Systems'), 'Must mention AGI preset in output');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --preset agi verified');
}

// 10. --analyze vision flag
{
  const out = execSync(`node "${cliPath}" --analyze "Build an autonomous code agent"`, { encoding: 'utf8' });
  assert(out.includes('OpenGuild Supreme Auto-Analyst Blueprint'), 'Must produce analysis blueprint');
  assert(out.includes('AUTONOMOUS_AI'), 'Must infer AUTONOMOUS_AI domain');
  console.log('  ✔ CLI --analyze flag verified');
}

// 11. --tokens flag
{
  const out = execSync(`node "${cliPath}" --tokens`, { encoding: 'utf8' });
  assert(out.includes('Token & Context Diet Report'), 'Must profile tokens');
  assert(out.includes('Token Economy & Cost Savings'), 'Must calculate savings');
  console.log('  ✔ CLI --tokens flag verified');
}

// 12. --verify flag in isolated directory
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-veri-cli-'));
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'verify-sample', scripts: { test: 'node -e "process.exit(0)"' } })
  );
  const out = execSync(`node "${cliPath}" --verify`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('OpenGuild Deterministic Verification Proof'), 'Must run verifier');
  assert(out.includes('CERTIFIED INVARIANT PROOF (PASSED)'), 'Must pass clean verify');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --verify flag verified');
}

// 13. --audit flag
{
  const out = execSync(`node "${cliPath}" --audit`, { encoding: 'utf8' });
  assert(out.includes('OpenGuild SAIF 2.0 Security Audit'), 'Must run security auditor');
  assert(out.includes('Security Grade:'), 'Must produce security grade');
  console.log('  ✔ CLI --audit flag verified');
}

console.log('✨ All CLI End-to-End Tests Passed!\n');
