const assert = require('assert');
const { diagnoseFailure, runTestAndCapture, runSelfHealing } = require('../lib/healer');

console.log('🧪 Running Autonomous Self-Healing Test Runner Tests...');

// 1. diagnoseFailure classification
{
  const assertionTrace = `
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected
+ 4
- 5
    at Object.<anonymous> (E:\\project\\tests\\math.test.js:12:8)
`;
  const diag1 = diagnoseFailure(assertionTrace);
  assert.strictEqual(diag1.errorType, 'ASSERTION_MISMATCH');
  assert(diag1.failingFile.includes('math.test.js'));
  assert.strictEqual(diag1.lineNumber, 12);
  assert(diag1.suggestion.includes('boundary cases') || diag1.suggestion.includes('expectations'));

  const syntaxTrace = `
SyntaxError: Unexpected token '}'
    at wrapSafe (internal/modules/cjs/loader.js:979:16)
    at Object.<anonymous> (E:\\project\\lib\\parser.js:45:1)
`;
  const diag2 = diagnoseFailure(syntaxTrace);
  assert.strictEqual(diag2.errorType, 'SYNTAX_ERROR');
  assert(diag2.failingFile.includes('parser.js'));
  assert.strictEqual(diag2.lineNumber, 45);

  const moduleTrace = `
Error: Cannot find module './missing_module'
    at require (internal/modules/cjs/helpers.js:88:18)
    at Object.<anonymous> (E:\\project\\lib\\app.js:5:1)
`;
  const diag3 = diagnoseFailure(moduleTrace);
  assert.strictEqual(diag3.errorType, 'MISSING_MODULE');

  const nullTrace = `
TypeError: Cannot read properties of undefined (reading 'token')
    at verify (E:\\project\\lib\\auth.js:22:15)
`;
  const diag4 = diagnoseFailure(nullTrace);
  assert.strictEqual(diag4.errorType, 'TYPE_OR_NULL_ERROR');

  console.log('  ✔ diagnoseFailure correctly classifies assertion, syntax, module, and null errors');
}

// 2. runTestAndCapture
{
  const passingRun = runTestAndCapture('node -e "process.exit(0)"');
  assert.strictEqual(passingRun.exitCode, 0);

  const failingRun = runTestAndCapture('node -e "process.exit(1)"');
  assert.strictEqual(failingRun.exitCode, 1);

  console.log('  ✔ runTestAndCapture accurately captures exit codes and outputs');
}

// 3. runSelfHealing on passing command
{
  const result = runSelfHealing({
    testCmd: 'node -e "process.exit(0)"',
    autoRecordLesson: false
  });
  assert.strictEqual(result.healed, true);
  assert.strictEqual(result.status, 'GREEN');
  assert.strictEqual(result.diagnosis, null);

  console.log('  ✔ runSelfHealing handles healthy test suites');
}

// 4. runSelfHealing on failing command
{
  const result = runSelfHealing({
    testCmd: 'node -e "throw new Error(\'synthetic test failure\')"',
    autoRecordLesson: false
  });
  assert.strictEqual(result.healed, false);
  assert.strictEqual(result.status, 'RED');
  assert(result.diagnosis !== null);

  console.log('  ✔ runSelfHealing diagnoses failing test commands');
}

console.log('✨ All Autonomous Self-Healing Tests Passed!\n');
