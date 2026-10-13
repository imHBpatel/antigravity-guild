/**
 * Tests for Nanosecond Performance and Latency Benchmarker
 */

const assert = require('assert');
const path = require('path');
const {
  benchmarkFunction,
  benchmarkModule,
  formatBenchmarkReport,
  calculatePerformanceGrade
} = require('../lib/perf_benchmarker');

console.log('🧪 Running Performance Benchmarker Tests...');

// 1. Test benchmarkFunction on lightweight addition function
function fastAdd(a = 1, b = 2) {
  return a + b;
}

const bench = benchmarkFunction(fastAdd, [5, 10], { iterations: 1000, warmup: 50 });
assert.strictEqual(bench.iterations, 1000);
assert(bench.opsPerSec > 1000, 'Fast addition should easily exceed 1,000 ops/sec');
assert(bench.p50Us >= 0);
assert(bench.p99Us >= bench.p50Us, 'p99 latency should be >= p50 latency');
assert(typeof bench.heapDeltaKb === 'number');
console.log('  ✔ Function micro-benchmarking verified');

// 2. Test calculatePerformanceGrade
assert(calculatePerformanceGrade(500000, 10).includes('A+'));
assert(calculatePerformanceGrade(50000, 100).includes('A'));
assert(calculatePerformanceGrade(5000, 1000).includes('B'));
assert(calculatePerformanceGrade(50, 10000).includes('D'));
console.log('  ✔ Performance grade calculation verified');

// 3. Test benchmarkModule on constants.js
const modBench = benchmarkModule(path.join(__dirname, '../lib/constants.js'), { iterations: 200, warmup: 20 });
assert.strictEqual(modBench.success, true);
assert(modBench.benchmarks.length > 0);

const report = formatBenchmarkReport(modBench);
assert(report.includes('Nanosecond Performance Scorecard'));
assert(report.includes('Ops / Sec'));
console.log('  ✔ Module benchmarking and report generation verified');

console.log('✨ All Performance Benchmarker Tests Passed!\n');
