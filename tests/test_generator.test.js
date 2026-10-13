'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { extractParamNames, synthesizeTestSuite, generatePythonTestSuite } = require('../lib/test_generator');

console.log('🧪 Running Automated Test Suite Synthesizer Tests...');

// 1. Parameter Extraction
{
  const params1 = extractParamNames('function calculateTotal(subtotal, taxRate = 0.05, discount)');
  assert.deepStrictEqual(params1, ['subtotal', 'taxRate', 'discount']);

  const params2 = extractParamNames('(a: number, b: string): boolean');
  assert.deepStrictEqual(params2, ['a', 'b']);

  const paramsEmpty = extractParamNames('()');
  assert.deepStrictEqual(paramsEmpty, []);
  console.log('  ✔ Function parameter extraction verified');
}

// 2. Synthesize Test Suite for Real JS File
{
  const targetFile = path.resolve(__dirname, '../lib/healer.js');
  const result = synthesizeTestSuite(targetFile, { write: false });

  assert.strictEqual(result.framework, 'node:assert');
  assert.ok(result.symbolsCount > 0, 'Should extract callable symbols');
  assert.ok(result.testCode.includes("require('assert')"), 'Test code should import assert');
  assert.ok(result.testCode.includes('Happy Path'), 'Test code should contain happy path assertions');
  assert.ok(result.testCode.includes('Null Guard'), 'Test code should contain null boundary assertions');
  assert.ok(result.testFileName.endsWith('.test.js'), 'Test filename should end with .test.js');
  console.log('  ✔ JavaScript AST test suite synthesis verified');
}

// 3. Synthesize Test Suite with Write Option to Temp Dir
{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-test-gen-'));
  const dummyFile = path.join(tempDir, 'sample_util.js');
  fs.writeFileSync(dummyFile, 'function add(a, b) { return a + b; }\nmodule.exports = { add };\n', 'utf8');

  const result = synthesizeTestSuite(dummyFile, { cwd: tempDir, write: true });
  assert.strictEqual(result.written, true);
  assert.ok(fs.existsSync(result.targetTestPath), 'Synthesized test file should be written to disk');

  const writtenContent = fs.readFileSync(result.targetTestPath, 'utf8');
  assert.ok(writtenContent.includes('sample_util.js'));
  assert.ok(writtenContent.includes('add: Happy path test verified'));

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('  ✔ Disk writing and hermetic execution verified');
}

// 4. Python Test Suite Synthesis
{
  const pyTestCode = generatePythonTestSuite('utils/math_helper.py', 'def add(a, b): return a + b');
  assert.ok(pyTestCode.includes('import pytest'));
  assert.ok(pyTestCode.includes('math_helper'));
  console.log('  ✔ Python test suite synthesis verified');
}

console.log('✨ All Test Suite Synthesizer Tests Passed!\n');
