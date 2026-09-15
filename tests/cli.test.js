'use strict';

const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { enforceGitignore } = require('../lib/gitignore');
const { VERSION, TOOL_NAME } = require('../lib/constants');

console.log('🧪 Running CLI & Idempotency End-to-End Tests...');

const cliPath = path.resolve(__dirname, '../bin/cli.js');

// 1. --version flag
{
  const out = execSync(`node "${cliPath}" --version`, { encoding: 'utf8' }).trim();
  assert(out.includes(`${TOOL_NAME} v${VERSION}`), `Expected ${TOOL_NAME} v${VERSION}, got ${out}`);
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

// 14. All-In-One Zero-Prompt Setup (Steve Jobs "It Just Works" test)
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-apple-setup-'));
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'apple-app', scripts: { test: 'node -e "process.exit(0)"' } }));
  const out = execSync(`node "${cliPath}"`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('It Just Works'), 'Must output Apple philosophy banner');
  assert(fs.existsSync(path.join(tmpDir, '.cursor', 'mcp.json')), 'Must auto-generate cursor mcp.json');
  assert(fs.existsSync(path.join(tmpDir, '.gemini', 'mcp_config.json')), 'Must auto-generate gemini mcp_config.json');
  assert(fs.existsSync(path.join(tmpDir, '.openguild', 'team_memory.md')), 'Must auto-generate team_memory.md');
  assert(fs.existsSync(path.join(tmpDir, '.openguild', 'active_task.md')), 'Must auto-generate active_task.md');
  assert(fs.existsSync(path.join(tmpDir, 'AGENTS.md')), 'Must auto-generate AGENTS.md');
  const agentsContent = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf8');
  assert(agentsContent.includes('Autonomous Pre-Flight Protocol (Zero-Prompt Mandate)'), 'Must include Zero-Prompt Mandate');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ All-In-One Zero-Prompt Setup verified');
}

// 15. --repomap flag
{
  const out = execSync(`node "${cliPath}" --repomap`, { encoding: 'utf8' });
  assert(out.includes('AST Symbol Repo-Map'), 'Must produce AST repo map');
  assert(out.includes('Analyzed'), 'Must output analysis summary');
  console.log('  ✔ CLI --repomap flag verified');
}

// 16. --memory-bank flag
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-bank-cli-'));
  const out = execSync(`node "${cliPath}" --memory-bank`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('Living Memory Bank'), 'Must output Living Memory Bank header');
  assert(out.includes('active_task.md'), 'Must output active_task.md');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --memory-bank flag verified');
}

// 17. --search flag
{
  const out = execSync(`node "${cliPath}" --search "security"`, { encoding: 'utf8' });
  assert(out.includes('BM25 Hybrid Memory Search'), 'Must run BM25 search');
  console.log('  ✔ CLI --search flag verified');
}

// 18. --resolve-conflicts flag
{
  const out = execSync(`node "${cliPath}" --resolve-conflicts --dry-run`, { encoding: 'utf8' });
  assert(out.includes('Memory Conflict & Evolution Audit'), 'Must run conflict audit');
  console.log('  ✔ CLI --resolve-conflicts flag verified');
}

// 19. --review flag
{
  const out = execSync(`node "${cliPath}" --review "${path.join(__dirname, '../lib/constants.js')}"`, { encoding: 'utf8' });
  assert(out.includes('OmniGuild Council SOP Review'), 'Must run council review');
  assert(out.includes('Verdict:'), 'Must produce verdict');
  console.log('  ✔ CLI --review flag verified');
}

// 20. --pack flag
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-pack-cli-'));
  fs.writeFileSync(path.join(tmpDir, 'test.js'), 'console.log(1);');
  const out = execSync(`node "${cliPath}" --pack "${tmpDir}"`, { encoding: 'utf8' });
  assert(out.includes('OmniGuild Codebase Context Bundle'), 'Must run packager');
  assert(out.includes('Directory Structure'), 'Must include file tree');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --pack flag verified');
}

// 21. --pr flag
{
  const out = execSync(`node "${cliPath}" --pr`, { encoding: 'utf8' });
  assert(out.includes('Summary of Changes'), 'Must output PR summary');
  assert(out.includes('Multi-Role Council Sign-Offs'), 'Must output Council sign-offs');
  console.log('  ✔ CLI --pr flag verified');
}

// 22. --commit flag
{
  const out = execSync(`node "${cliPath}" --commit "test commit message"`, { encoding: 'utf8' });
  assert(out.includes('Suggested Commit Message:'), 'Must output suggested commit message');
  console.log('  ✔ CLI --commit flag verified');
}

// 23. --heal flag
{
  const out = execSync(`node "${cliPath}" --heal --test-cmd "node -e process.exit(0)"`, { encoding: 'utf8' });
  assert(out.includes('OmniGuild Self-Healing Test Runner: GREEN'), 'Must run self healing test runner');
  console.log('  ✔ CLI --heal flag verified');
}

// 24. --graph flag
{
  const out = execSync(`node "${cliPath}" --graph`, { encoding: 'utf8' });
  assert(out.includes('OmniGuild Working Context (L1 RAM)'), 'Must output L1 context');
  console.log('  ✔ CLI --graph flag verified');
}

// 25. --reproduce flag (dry run)
{
  const out = execSync(`node "${cliPath}" --reproduce "Test reproduction issue" --dry-run`, { encoding: 'utf8' });
  assert(out.includes('Bug Successfully Reproduced'), 'Must reproduce issue');
  console.log('  ✔ CLI --reproduce flag verified');
}

// 26. --apply flag
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-cli-apply-'));
  const testFile = path.join(tmpDir, 'test.js');
  fs.writeFileSync(testFile, 'const a = 1;\n', 'utf8');
  const patchFile = path.join(tmpDir, 'test.patch');
  fs.writeFileSync(patchFile, `### test.js\n<<<<<<< SEARCH\nconst a = 1;\n=======\nconst a = 2;\n>>>>>>> REPLACE\n`, 'utf8');

  const out = execSync(`node "${cliPath}" --apply "${patchFile}"`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('[Patch Applied]'), 'Must apply patch');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --apply flag verified');
}

// 27. --undo flag (in isolated git repo)
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-cli-undo-'));
  execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore' });
  const testFile = path.join(tmpDir, 'test.txt');
  fs.writeFileSync(testFile, 'initial\n', 'utf8');
  execSync('git add test.txt', { cwd: tmpDir, stdio: 'ignore' });
  execSync('git commit -m "initial commit"', { cwd: tmpDir, stdio: 'ignore' });

  // Modify tracked file
  fs.writeFileSync(testFile, 'modified\n', 'utf8');
  const out = execSync(`node "${cliPath}" --undo`, { cwd: tmpDir, encoding: 'utf8' });
  assert(out.includes('Rollback') || out.includes('Reverted'), 'Must execute rollback');
  const restored = fs.readFileSync(testFile, 'utf8').trim();
  assert.strictEqual(restored, 'initial');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ CLI --undo flag verified');
}

// 28. --context flag
{
  const out = execSync(`node "${cliPath}" --context "@symbol:VERSION @git"`, { encoding: 'utf8' });
  assert(out.includes('OmniGuild Expanded Context') || out.includes('Symbol'), 'Must expand context');
  console.log('  ✔ CLI --context flag verified');
}

console.log('✨ All CLI End-to-End Tests Passed!\n');
