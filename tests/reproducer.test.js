const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { synthesizeReproducer, runReproducer, handleReproduceCommand } = require('../lib/reproducer');

console.log('🧪 Running Devin & SWE-Agent Reproducer Synthesizer Tests...');

// 1. synthesizeReproducer test
{
  const desc = 'Token expiration verification fails on clock skew';
  const synth = synthesizeReproducer(desc, process.cwd());

  assert(synth.testFile.includes('reproduce_issue.test.js'));
  assert(synth.testCode.includes('OmniGuild Reproducer Test'));
  assert(synth.testCode.includes(desc));
  assert(synth.testCode.includes('assert.strictEqual'));

  console.log('  ✔ synthesizeReproducer creates standalone hermetic test code');
}

// 2. runReproducer test on synthesized test
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-reproduce-test-'));
  const testFile = path.join(tmpDir, 'failing_reproduce.test.js');

  fs.writeFileSync(testFile, `
const assert = require('assert');
assert.strictEqual(false, true, 'Intentional bug reproduction failure');
`, 'utf8');

  const result = runReproducer(testFile, tmpDir);
  assert.strictEqual(result.status, 'REPRODUCED');
  assert(result.output.includes('Intentional bug reproduction failure'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ runReproducer accurately classifies failing test as REPRODUCED bug');
}

// 3. handleReproduceCommand with dryRun
{
  const res = handleReproduceCommand('User signup allows empty usernames', { dryRun: true });
  assert.strictEqual(res.status, 'REPRODUCED');
  assert(res.message.includes('Bug Successfully Reproduced'));
  console.log('  ✔ handleReproduceCommand handles end-to-end command orchestration');
}

console.log('✨ All Reproducer Synthesizer Tests Passed!\n');
