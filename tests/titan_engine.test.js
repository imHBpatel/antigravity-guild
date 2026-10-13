/**
 * Tests for the Titan 100% Autonomous Pipeline Engine
 */

const assert = require('assert');
const path = require('path');
const { runTitan, diagnoseRootCauses, formatDiagnosticBlueprint } = require('../lib/titan_engine');

console.log('🧪 Running Titan Sovereign Pipeline Tests...');

(async () => {
  // 1. Test root cause diagnosis
  const issues = diagnoseRootCauses(path.resolve(__dirname, '..'));
  assert(Array.isArray(issues));
  const blueprint = formatDiagnosticBlueprint(issues);
  assert(typeof blueprint === 'string');
  console.log('  ✔ Root cause diagnosis and blueprint verified');

  // 2. Execute runTitan in dry-run mode
  const result = await runTitan('Scaffold analytics API and verify invariants', {
    cwd: path.resolve(__dirname, '..'),
    dryRun: true,
    commit: false,
    yes: true
  });

  assert.strictEqual(result.goal, 'Scaffold analytics API and verify invariants');
  assert(Array.isArray(result.phases), 'Phases must be an array');
  assert.strictEqual(result.phases.length, 10, 'Titan must execute all 10 distinct phases');

  for (let i = 0; i < 10; i++) {
    assert.strictEqual(result.phases[i].phase, i + 1);
    assert(result.phases[i].success === true, `Phase ${i + 1} should succeed in dry-run mode`);
  }

  assert(result.durationMs > 0);
  assert(result.overallSuccess === true);

  console.log('  ✔ All 10 Titan phases executed and verified in unbounded mode');
  console.log('✨ All Titan Pipeline Tests Passed!\n');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
