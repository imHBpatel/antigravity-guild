'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { inferDomain, analyzeVision, analyzeWorkspace, autoAnalyze } = require('../lib/analyzer');

console.log('🧪 Running Autonomous Auto-Analyst Tests...');

// 1. Domain Inference Tests
{
  assert.strictEqual(inferDomain('Build an autonomous trading agent with recursive self-improvement'), 'AUTONOMOUS_AI');
  assert.strictEqual(inferDomain('A peer-to-peer cryptocurrency payment gateway with escrow'), 'FINTECH_SECURITY');
  assert.strictEqual(inferDomain('A real-time collaborative whiteboard with live sockets'), 'REALTIME_DISTRIBUTED');
  assert.strictEqual(inferDomain('An iOS and Android mobile fitness tracker app in Flutter'), 'MOBILE_CLIENT');
  assert.strictEqual(inferDomain('An online storefront with cart and checkout'), 'ECOMMERCE_PLATFORM');
  assert.strictEqual(inferDomain('A CRM dashboard for enterprise sales teams'), 'SAAS_PLATFORM');
  console.log('  ✔ Domain inference verified');
}

// 2. Vision Blueprint Generation Tests
{
  const blueprint = analyzeVision('Build an autonomous multi-agent software engineering team with self-healing tests');
  assert(blueprint.includes('OpenGuild Supreme Auto-Analyst Blueprint'), 'Must contain title');
  assert(blueprint.includes('AUTONOMOUS_AI'), 'Must infer AUTONOMOUS_AI domain');
  assert(blueprint.includes('Anticipated Edge Cases & Hidden Traps'), 'Must list edge cases');
  assert(blueprint.includes('Infinite agent recursion loops'), 'Must include domain-specific edge case');
  assert(blueprint.includes('Deterministic Verification Contracts'), 'Must include invariant contracts');
  assert(blueprint.includes('Phased Implementation Roadmap'), 'Must include phased roadmap');
  console.log('  ✔ Vision blueprint generation verified');
}

// 3. Workspace Auto-Analysis Tests
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-ana-'));
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'sample-app' }));

  const analysis = analyzeWorkspace(tmpDir);
  assert(analysis.includes('OpenGuild Workspace Auto-Analysis'), 'Must contain workspace analysis title');
  assert(analysis.includes('Deterministic Verification Invariants'), 'Must contain invariants');
  assert(analysis.includes('Recommended Next Actions'), 'Must contain council recommendations');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Workspace auto-analysis verified');
}

// 4. Universal autoAnalyze Dispatch
{
  const resVision = autoAnalyze('Build a decentralized social network');
  assert(resVision.includes('OpenGuild Supreme Auto-Analyst Blueprint'));

  const resCwd = autoAnalyze();
  assert(resCwd.includes('OpenGuild Workspace Auto-Analysis'));
  console.log('  ✔ Universal autoAnalyze dispatch verified');
}

console.log('✨ All Auto-Analyst Tests Passed!\n');
