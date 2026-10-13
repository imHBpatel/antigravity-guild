/**
 * Tests for Chaos Engineering and Negative Input Fuzzer
 */

const assert = require('assert');
const path = require('path');
const {
  CHAOS_PAYLOADS,
  fuzzFunction,
  fuzzModule,
  formatFuzzReport,
  calculateResilienceGrade
} = require('../lib/chaos_fuzzer');

console.log('🧪 Running Chaos Engineering Fuzzer Tests...');

// 1. Verify CHAOS_PAYLOADS suite
assert(Array.isArray(CHAOS_PAYLOADS), 'CHAOS_PAYLOADS must be an array');
assert(CHAOS_PAYLOADS.length >= 20, 'Should have at least 20 boundary chaos payloads');
console.log('  ✔ Chaos payload suite verified');

// 2. Test fuzzFunction on defensive function
function defensiveFn(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Expected string input');
  }
  return input.toUpperCase();
}

const defResult = fuzzFunction(defensiveFn, 'defensiveFn');
assert.strictEqual(defResult.functionName, 'defensiveFn');
assert.strictEqual(defResult.totalTests, CHAOS_PAYLOADS.length);
assert.strictEqual(defResult.unhandledCrashes, 0, 'Defensive throws should not be counted as unhandled crashes');
assert(defResult.resilienceScore >= 95, 'Defensive function should achieve >= 95% resilience');
console.log('  ✔ Defensive function resilience verified');

// 3. Test calculateResilienceGrade
assert.strictEqual(calculateResilienceGrade(98), 'A+ (Hardened Sovereign)');
assert.strictEqual(calculateResilienceGrade(88), 'A (Production Resilient)');
assert.strictEqual(calculateResilienceGrade(75), 'B (Adequate Defense)');
assert.strictEqual(calculateResilienceGrade(30), 'F (Critical Boundary Failures)');
console.log('  ✔ Resilience grade thresholds verified');

// 4. Test fuzzModule on internal scaffolder
const modResult = fuzzModule(path.join(__dirname, '../lib/scaffolder.js'));
assert.strictEqual(modResult.success, true);
assert(modResult.totalFunctionsFuzzed > 0);
assert(modResult.averageResilienceScore >= 70);

const reportText = formatFuzzReport(modResult);
assert(reportText.includes('Chaos Engineering Fuzz Report'));
assert(reportText.includes('Resilience Grade:'));
console.log('  ✔ Module fuzzing and report formatting verified');

console.log('✨ All Chaos Engineering Fuzzer Tests Passed!\n');
