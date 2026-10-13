'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { compareVersions, extractVersion, runDepScan, parseNpmDeps, scanVulnerabilities } = require('../lib/dep_scanner');

console.log('  ⏱ dep_scanner.test.js');

// Test 1: Version comparison
assert.strictEqual(compareVersions('1.0.0', '2.0.0'), -1);
assert.strictEqual(compareVersions('2.0.0', '1.0.0'), 1);
assert.strictEqual(compareVersions('1.0.0', '1.0.0'), 0);
assert.strictEqual(compareVersions('1.2.3', '1.2.4'), -1);
assert.strictEqual(compareVersions('1.10.0', '1.9.0'), 1);

// Test 2: Extract version from range
assert.strictEqual(extractVersion('^1.2.3'), '1.2.3');
assert.strictEqual(extractVersion('~2.0.0'), '2.0.0');
assert.strictEqual(extractVersion('>=3.0.0'), '3.0.0');
assert.strictEqual(extractVersion('*'), null);

// Test 3: Parse npm deps from test package.json
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-deps-'));
fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
  name: 'test-project',
  dependencies: { 'lodash': '^4.17.15', 'express': '^4.17.0' },
  devDependencies: { 'jest': '^29.0.0' },
}));

const parsed = parseNpmDeps(tmpDir);
assert.ok(parsed, 'Should parse npm deps');
assert.strictEqual(parsed.ecosystem, 'npm');
assert.ok(parsed.dependencies['lodash'], 'Should find lodash');
assert.strictEqual(parsed.dependencies['jest'].type, 'development');

// Test 4: Scan for known vulnerabilities
const vulns = scanVulnerabilities(parsed);
assert.ok(vulns.length > 0, 'Should detect vulnerable lodash version');
const lodashVuln = vulns.find(v => v.package === 'lodash');
assert.ok(lodashVuln, 'lodash 4.17.15 should be flagged');
assert.strictEqual(lodashVuln.severity, 'HIGH');

// Test 5: Full dep scan report
const result = runDepScan(tmpDir);
assert.ok(result.report.includes('Dependency Vulnerability Scan'), 'Should have scan header');

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('  ✅ dep_scanner: All tests passed');
