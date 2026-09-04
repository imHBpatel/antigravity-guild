'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { buildRuleContent, mergeRuleContent, synthesizeContracts } = require('../lib/generator');

console.log('🧪 Running Generator & Rule Synthesis Tests...');

// 1. Check Full Council (12 Members) & Invariants
{
  const stack = {
    lang: 'TypeScript',
    framework: 'Next.js',
    pkgManager: 'pnpm',
    isMonorepo: false,
    testCmd: 'pnpm test',
    lintCmd: 'pnpm run lint',
    typecheckCmd: 'pnpm run typecheck',
  };

  const rule = buildRuleContent('test-project', '/home/user/.openguild/memory', stack, 'full');

  // Assert Council members
  assert(rule.includes('**Chief Software Architect**'), 'Must include Architect');
  assert(rule.includes('**Principal UI/UX Lead**'), 'Must include UI/UX Lead');
  assert(rule.includes('**Chief Security Officer**'), 'Must include Security Officer');
  assert(rule.includes('**Staff Full-Stack Engineer**'), 'Must include Staff Engineer');
  assert(rule.includes('**Principal QA Lead**'), 'Must include QA Lead');
  assert(rule.includes('**DevOps Engineer**'), 'Must include DevOps');
  assert(rule.includes('**Google CTO Brain**'), 'Must include Google CTO Brain');
  assert(rule.includes('**Apple CTO Brain**'), 'Must include Apple CTO Brain');
  assert(rule.includes('**Anthropic Safety Brain**'), 'Must include Anthropic Safety Brain');
  assert(rule.includes('**Performance & Latency Specialist**'), 'Must include Performance Specialist');
  assert(rule.includes('**Database Reliability Engineer**'), 'Must include Database Reliability Engineer');
  assert(rule.includes('**Product & Domain Strategy Lead**'), 'Must include Product Lead');
  assert(rule.includes('**Chief Cognitive Analyst & Requirements Oracle**'), 'Must include Cognitive Analyst');
  assert(rule.includes('**Principal AGI & Cognitive Architecture Scientist**'), 'Must include AGI Scientist');
  assert(rule.includes('**Autonomous Self-Healing & Evolution Specialist**'), 'Must include Self-Healing Specialist');
  assert(rule.includes('**High-Dimensional Knowledge & Vector Graph Architect**'), 'Must include Knowledge Graph Architect');

  // Assert verification invariants
  assert(rule.includes('pnpm test'), 'Must include test command');
  assert(rule.includes('pnpm run lint'), 'Must include lint command');
  assert(rule.includes('pnpm run typecheck'), 'Must include typecheck command');

  // Assert Constitutional safeguards
  assert(rule.includes('Constitutional & SAIF Security Safeguards'), 'Must include Constitutional & SAIF section');
  assert(rule.includes('Destructive Operation Gate'), 'Must include destructive operation gate');
  assert(rule.includes('Zero Secret Exposure'), 'Must include secret exposure invariant');

  console.log('  ✔ 16-Mind Supreme Council and Constitutional Invariants verified');
}

// 2. Preset Testing: backend, mobile, & agi
{
  const stack = { lang: 'Go', framework: 'Gin', pkgManager: 'go', isMonorepo: false, testCmd: 'go test ./...', lintCmd: 'golangci-lint run', typecheckCmd: 'go vet ./...' };
  const backendRule = buildRuleContent('api', '/mem', stack, 'backend');
  assert(backendRule.includes('Backend & Distributed Systems'));
  assert(backendRule.includes('Database Reliability Engineer'));
  assert(!backendRule.includes('Principal UI/UX Lead'), 'Backend preset should not include UI/UX');

  const agiRule = buildRuleContent('agent-system', '/mem', stack, 'agi');
  assert(agiRule.includes('AGI & Autonomous Cognitive Systems'));
  assert(agiRule.includes('Principal AGI & Cognitive Architecture Scientist'));
  assert(agiRule.includes('Autonomous Self-Healing & Evolution Specialist'));

  const mobileRule = buildRuleContent('app', '/mem', stack, 'mobile');
  assert(mobileRule.includes('Mobile & Client Apps'));
  assert(mobileRule.includes('Principal UI/UX Lead'));
  assert(!mobileRule.includes('Database Reliability Engineer'));

  console.log('  ✔ Domain Presets (backend & mobile) verified');
}

// 3. Non-destructive rule merge
{
  const existing = `# Sovereign AI Engineering Guild: old-project

## Custom Workspace Rules
- Never use semicolons in JavaScript.
- Always use kebab-case for CSS class names.
`;

  const newlyGenerated = `# Sovereign AI Engineering Guild: new-project\n\n## 1. Global Brain Connection\n`;

  const merged = mergeRuleContent(existing, newlyGenerated);
  assert(merged.includes('## Custom Workspace Rules'), 'Must preserve custom user rules');
  assert(merged.includes('Never use semicolons in JavaScript'), 'Must preserve custom rule details');
  assert(merged.includes('## 1. Global Brain Connection'), 'Must include new OpenGuild sections');

  console.log('  ✔ Non-destructive rule merging verified');
}

// 4. Contract Synthesis on disk
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-contracts-'));
  const stack = {
    lang: 'JavaScript',
    framework: 'React',
    pkgManager: 'npm',
    isMonorepo: false,
    testCmd: 'npm test',
    lintCmd: 'npm run lint',
    typecheckCmd: 'echo "none"',
  };

  const results = synthesizeContracts(tmpDir, 'tmp-app', '/mock/memory', stack, 'web', false);
  assert.strictEqual(results.length, 3);
  assert(fs.existsSync(path.join(tmpDir, '.gemini', 'rules.md')));
  assert(fs.existsSync(path.join(tmpDir, 'AGENTS.md')));
  assert(fs.existsSync(path.join(tmpDir, '.cursorrules')));

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Disk synthesis for Gemini, Universal AGENTS, and Cursor passed');
}

console.log('✨ All Generator Tests Passed!\n');
