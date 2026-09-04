'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { estimateTokens, getEfficiencyGrade, profileTokens } = require('../lib/token_profiler');

console.log('🧪 Running Token Profiler & Context Diet Tests...');

// 1. Token Estimation Tests
{
  assert.strictEqual(estimateTokens(''), 0);
  const sample = 'This is a sample sentence with several common words and punctuation symbols.';
  const tokens = estimateTokens(sample);
  assert(tokens > 10 && tokens < 25, `Expected tokens around 14-18, got ${tokens}`);
  console.log('  ✔ Token estimation verified');
}

// 2. Efficiency Grade Thresholds
{
  assert.strictEqual(getEfficiencyGrade(300).grade, 'A+');
  assert.strictEqual(getEfficiencyGrade(600).grade, 'A');
  assert.strictEqual(getEfficiencyGrade(1000).grade, 'B');
  assert.strictEqual(getEfficiencyGrade(2000).grade, 'C');
  console.log('  ✔ Efficiency grade thresholds verified');
}

// 3. Workspace Profile Tests
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-token-'));
  fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# Rule Header\n- Instruction 1\n- Instruction 2\n');

  const res = profileTokens(tmpDir);
  assert(typeof res.baseContractTokens === 'number');
  assert(res.savingsPercent > 50, 'Must calculate substantial token savings');
  assert(res.reportMarkdown.includes('Token & Context Diet Report'), 'Must contain report title');
  assert(res.reportMarkdown.includes('Token Economy & Cost Savings'), 'Must contain savings section');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Workspace token profiling verified');
}

console.log('✨ All Token Profiler Tests Passed!\n');
