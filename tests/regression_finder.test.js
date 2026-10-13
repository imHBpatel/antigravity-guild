'use strict';
const assert = require('assert');
const { isGitRepo, runTestCommand, getRecentCommits, formatBisectReport } = require('../lib/regression_finder');

console.log('  ⏱ regression_finder.test.js');

// Test 1: isGitRepo should detect git repo
const isRepo = isGitRepo(process.cwd());
assert.strictEqual(typeof isRepo, 'boolean', 'isGitRepo should return boolean');
// We're running from the project root which IS a git repo
assert.strictEqual(isRepo, true, 'Project root should be a git repo');

// Test 2: Run a passing test command
const passResult = runTestCommand(process.cwd(), 'node -e "process.exit(0)"', 5000);
assert.strictEqual(passResult.passed, true, 'Exit 0 should be a pass');

// Test 3: Run a failing test command
const failResult = runTestCommand(process.cwd(), 'node -e "process.exit(1)"', 5000);
assert.strictEqual(failResult.passed, false, 'Exit 1 should be a fail');

// Test 4: Get recent commits
const commits = getRecentCommits(process.cwd(), 5);
assert.ok(Array.isArray(commits), 'Should return array of commits');
if (commits.length > 0) {
  assert.ok(commits[0].hash, 'Commits should have hash');
  assert.ok(commits[0].subject, 'Commits should have subject');
}

// Test 5: Format report handles null culprit
const emptyReport = formatBisectReport(null, [], 'npm test', 'abc123');
assert.ok(emptyReport.includes('Could not identify'), 'Should handle null culprit gracefully');

// Test 6: Format report with valid data
const mockCulprit = {
  hash: 'abc123def456', short: 'abc123d', subject: 'fix: break everything',
  author: 'Test User', date: '2026-09-15',
  diff: { stat: 'M lib/auth.js', message: 'fix: break everything' },
};
const mockSteps = [
  { index: 0, commit: 'aaa', fullHash: 'aaa111', passed: true, remaining: 3 },
  { index: 1, commit: 'bbb', fullHash: 'bbb222', passed: false, remaining: 1 },
];
const report = formatBisectReport(mockCulprit, mockSteps, 'npm test', 'start123');
assert.ok(report.includes('Regression Commit Found'), 'Should have found header');
assert.ok(report.includes('abc123d'), 'Should include culprit commit');
assert.ok(report.includes('Bisect Steps'), 'Should include step table');

console.log('  ✅ regression_finder: All tests passed');
