'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateSbom, generatePurl, generateUuid, createComponent, diffSboms } = require('../lib/sbom_generator');

console.log('  ⏱ sbom_generator.test.js');

// Test 1: Generate PURL for npm package
assert.strictEqual(generatePurl('npm', 'lodash', '4.17.21'), 'pkg:npm/lodash@4.17.21');

// Test 2: Generate PURL for scoped package
const scopedPurl = generatePurl('npm', '@babel/core', '7.20.0');
assert.ok(scopedPurl.includes('pkg:npm/'), 'Should start with pkg:npm/');
assert.ok(scopedPurl.includes('7.20.0'), 'Should include version');

// Test 3: Generate UUID v4
const uuid = generateUuid();
assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid),
  `UUID should be valid v4 format, got: ${uuid}`);

// Test 4: Create component
const comp = createComponent('express', '4.18.2', { type: 'library', scope: 'required', license: 'MIT' });
assert.strictEqual(comp.name, 'express');
assert.strictEqual(comp.version, '4.18.2');
assert.strictEqual(comp.type, 'library');
assert.ok(comp.licenses[0].license.id === 'MIT');

// Test 5: Generate SBOM from test project
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-sbom-'));
fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
  name: 'test-app', version: '1.0.0', license: 'MIT',
  dependencies: { 'express': '^4.18.2', 'lodash': '^4.17.21' },
}));

const result = generateSbom(tmpDir);
assert.ok(result.sbom, 'Should generate SBOM object');
assert.strictEqual(result.sbom.bomFormat, 'CycloneDX');
assert.strictEqual(result.sbom.specVersion, '1.5');
assert.ok(result.sbom.components.length >= 2, 'Should have at least 2 components');
assert.ok(result.report.includes('Software Bill of Materials'), 'Report should have SBOM header');
assert.ok(result.json, 'Should generate JSON string');

// Test 6: SBOM diff
const sbomA = { components: [createComponent('a', '1.0.0'), createComponent('b', '2.0.0')] };
const sbomB = { components: [createComponent('b', '2.1.0'), createComponent('c', '1.0.0')] };
const diff = diffSboms(sbomA, sbomB);
assert.ok(diff.added.find(a => a.name === 'c'), 'Should detect added package');
assert.ok(diff.removed.find(r => r.name === 'a'), 'Should detect removed package');
assert.ok(diff.versionChanged.find(v => v.name === 'b'), 'Should detect version change');

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('  ✅ sbom_generator: All tests passed');
