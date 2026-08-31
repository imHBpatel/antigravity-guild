'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { initTeamMemory } = require('../lib/team_memory');
const { synthesizeContracts } = require('../lib/generator');

console.log('🧪 Running Workspace Team Memory Tests...');

// 1. Initialize team memory in temp project
{
  const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-team-'));
  const res1 = initTeamMemory(tmpProject);

  assert.strictEqual(res1.created, true);
  assert(fs.existsSync(path.join(tmpProject, '.openguild', 'team_memory.md')));
  assert(fs.existsSync(path.join(tmpProject, '.openguild', 'architecture_decisions.md')));

  // Second run should connect
  const res2 = initTeamMemory(tmpProject);
  assert.strictEqual(res2.created, false);

  // Synthesize rules should include team memory path
  const stack = { lang: 'JavaScript', framework: 'Express', pkgManager: 'npm', isMonorepo: false, testCmd: 'npm test', lintCmd: 'npm run lint', typecheckCmd: 'echo "none"' };
  const contracts = synthesizeContracts(tmpProject, 'team-app', '/mock/mem', stack, 'full', false);

  const agentsMd = fs.readFileSync(path.join(tmpProject, 'AGENTS.md'), 'utf8');
  assert(agentsMd.includes('Workspace Team Memory'), 'Must include team memory reference in rules');

  fs.rmSync(tmpProject, { recursive: true, force: true });
  console.log('  ✔ Team memory creation and rule integration passed');
}

console.log('✨ All Team Memory Tests Passed!\n');
