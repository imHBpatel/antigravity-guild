'use strict';
const assert = require('assert');
const path = require('path');
const {
  collectCodeHealth,
  collectMemoryHealth,
  collectSecurityHealth,
  collectDependencyHealth,
  collectGitVelocity,
  collectTestHealth,
  formatPulseReport,
  sparkline,
  runProjectPulse,
} = require('../lib/project_pulse');

console.log('  ⏱ project_pulse.test.js');

const projectRoot = path.resolve(__dirname, '..');

// Test 1: sparkline
const line = sparkline([10, 20, 50, 80, 100]);
assert.strictEqual(typeof line, 'string', 'Sparkline should return a string');
assert(line.length >= 5, 'Sparkline should have characters for values');

// Test 2: collectCodeHealth
const codeHealth = collectCodeHealth(projectRoot);
assert(codeHealth.totalFiles > 0, 'Should detect source files');
assert(codeHealth.totalLines > 0, 'Should count lines');
assert(codeHealth.grade, 'Should produce a grade');

// Test 3: collectMemoryHealth
const memoryHealth = collectMemoryHealth(projectRoot);
assert(typeof memoryHealth.entries === 'number', 'Should count memory entries');
assert(memoryHealth.grade, 'Should produce memory health grade');

// Test 4: collectSecurityHealth
const secHealth = collectSecurityHealth(projectRoot);
assert(typeof secHealth.score === 'number', 'Should produce security score');
assert(secHealth.grade, 'Should produce security grade');

// Test 5: collectDependencyHealth
const depHealth = collectDependencyHealth(projectRoot);
assert(typeof depHealth.directDeps === 'number', 'Should count direct dependencies');
assert(depHealth.grade, 'Should produce dependency grade');

// Test 6: collectTestHealth
const testHealth = collectTestHealth(projectRoot);
assert(testHealth.testFiles > 0, 'Should detect test files');
assert(testHealth.grade, 'Should produce test grade');

// Test 7: formatPulseReport & runProjectPulse
const pulse = runProjectPulse(projectRoot);
assert(pulse.report, 'Pulse should generate report');
assert(pulse.report.includes('PROJECT PULSE'), 'Report should include header');
assert(pulse.metrics.code, 'Should have code metrics');
assert(pulse.metrics.memory, 'Should have memory metrics');

console.log('  \x1b[32m✔ project_pulse.test.js passed\x1b[0m');
