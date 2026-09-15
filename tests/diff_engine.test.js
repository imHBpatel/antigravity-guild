const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { parseSearchReplaceBlocks, applySingleBlock, applyPatch, rollbackLastCheckpoint } = require('../lib/diff_engine');

console.log('🧪 Running Aider Surgical Diff Engine & Rollback Tests...');

// 1. parseSearchReplaceBlocks test
{
  const samplePatch = `
### lib/auth.js
<<<<<<< SEARCH
const token = jwt.sign(payload, secret);
=======
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
>>>>>>> REPLACE
`;

  const blocks = parseSearchReplaceBlocks(samplePatch);
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].file, 'lib/auth.js');
  assert.strictEqual(blocks[0].search, 'const token = jwt.sign(payload, secret);');
  assert.strictEqual(blocks[0].replace, "const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });");

  console.log('  ✔ parseSearchReplaceBlocks parses Aider block format and file headers');
}

// 2. applySingleBlock test
{
  const original = 'function auth() {\n  const token = jwt.sign(payload, secret);\n  return token;\n}';
  const search = '  const token = jwt.sign(payload, secret);';
  const replace = "  const token = jwt.sign(payload, key, { algorithm: 'RS256' });";

  const res = applySingleBlock(original, search, replace);
  assert.strictEqual(res.success, true);
  assert(res.newCode.includes("algorithm: 'RS256'"));

  console.log('  ✔ applySingleBlock executes atomic surgical replacement');
}

// 3. applyPatch on real temp file
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-diff-test-'));
  const targetFile = path.join(tmpDir, 'service.js');
  fs.writeFileSync(targetFile, 'const port = 3000;\nconst host = "localhost";\n', 'utf8');

  const patch = `
### service.js
<<<<<<< SEARCH
const port = 3000;
=======
const port = process.env.PORT || 8080;
>>>>>>> REPLACE
`;

  const result = applyPatch(patch, null, tmpDir);
  assert.strictEqual(result.appliedCount, 1);
  assert.strictEqual(result.totalBlocks, 1);

  const updatedContent = fs.readFileSync(targetFile, 'utf8');
  assert(updatedContent.includes('process.env.PORT || 8080'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ applyPatch performs disk modifications accurately');
}

// 4. rollbackLastCheckpoint test in isolated repo
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-rollback-test-'));
  try {
    execSync('git init', { cwd: tmpDir, stdio: ['pipe', 'pipe', 'ignore'] });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'version 1\n', 'utf8');
    execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: ['pipe', 'pipe', 'ignore'] });

    // Modify file
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'version 2 (modified)\n', 'utf8');

    const res = rollbackLastCheckpoint(tmpDir);
    assert.strictEqual(res.success, true);
    assert(res.message.includes('Rollback Successful'));

    const contentAfter = fs.readFileSync(path.join(tmpDir, 'file.txt'), 'utf8');
    assert.strictEqual(contentAfter.trim(), 'version 1', 'Must revert tracked changes back to version 1');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('  ✔ rollbackLastCheckpoint safely reverts working tree in isolated repo');
}

console.log('✨ All Surgical Diff Engine & Rollback Tests Passed!\n');
