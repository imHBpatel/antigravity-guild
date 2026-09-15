'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  generateAsciiTree,
  collectPackableFiles,
  packCodebase,
} = require('../lib/packager');

console.log('🧪 Running Smart Codebase Context Packager Tests...');

// 1. ASCII Tree Generation
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-tree-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'console.log("hello");');
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Demo');

    const tree = generateAsciiTree(tmpDir);
    assert(tree.includes('src'), 'Tree should list src directory');
    assert(tree.includes('index.js'), 'Tree should list index.js');
    assert(tree.includes('README.md'), 'Tree should list README.md');

    console.log('  ✔ generateAsciiTree verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 2. File Collection and Exclusions
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-collect-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'node_modules'));
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'dep.js'), 'dep');
    fs.writeFileSync(path.join(tmpDir, 'logo.png'), 'fake-binary');
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), 'export const app = 1;');

    const files = collectPackableFiles(tmpDir);
    assert.strictEqual(files.length, 1, 'Should only collect app.ts');
    assert(files[0].endsWith('app.ts'));

    console.log('  ✔ collectPackableFiles exclusions verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 3. Full packCodebase Pipeline & Secret Scrubbing
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-pack-'));

  try {
    const rawCodeWithSecret = `
const apiKey = "AKIAIOSFODNN7EXAMPLE";
export function connect() { return true; }
`;
    fs.writeFileSync(path.join(tmpDir, 'config.js'), rawCodeWithSecret);

    const outputFile = path.join(tmpDir, 'bundle.md');
    const result = packCodebase(tmpDir, { outputFile });

    assert.strictEqual(result.fileCount, 1);
    assert(result.totalTokens > 10, 'Token count should be calculated');
    assert(result.bundleMarkdown.includes('OmniGuild Codebase Context Bundle'));
    assert(result.bundleMarkdown.includes('[REDACTED_SECRET]'), 'Must scrub credentials in bundle');
    assert(!result.bundleMarkdown.includes('AKIAIOSFODNN7EXAMPLE'), 'Raw credentials must not leak into bundle');

    // Verify written to disk
    assert(fs.existsSync(outputFile));
    const saved = fs.readFileSync(outputFile, 'utf8');
    assert(saved.includes('[REDACTED_SECRET]'));

    console.log('  ✔ packCodebase bundling & automated secret scrubbing verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('✨ All Smart Codebase Context Packager Tests Passed!\n');
