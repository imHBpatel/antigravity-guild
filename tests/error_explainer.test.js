'use strict';
const assert = require('assert');
const { parseError, explainError, generateQuickFix, extractSourceContext } = require('../lib/error_explainer');

console.log('  ⏱ error_explainer.test.js');

// Test 1: Parse Node.js TypeError
const typeError = `TypeError: Cannot read properties of undefined (reading 'name')
    at getUser (/app/src/user.js:42:15)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)`;
const parsed = parseError(typeError);
assert.strictEqual(parsed.errorType, 'TypeError');
assert.ok(parsed.errorMessage.includes('Cannot read properties'));
assert.ok(parsed.stackFrames.length > 0, 'Should extract stack frames');
assert.strictEqual(parsed.sourceFile, '/app/src/user.js');
assert.strictEqual(parsed.sourceLine, 42);

// Test 2: Parse ReferenceError
const refError = `ReferenceError: myVariable is not defined\n    at Object.<anonymous> (/app/index.js:10:1)`;
const parsedRef = parseError(refError);
assert.strictEqual(parsedRef.errorType, 'ReferenceError');

// Test 3: Parse MODULE_NOT_FOUND
const moduleError = `Error: Cannot find module 'express'\nRequire stack:\n- /app/server.js`;
const parsedMod = parseError(moduleError);
assert.strictEqual(parsedMod.errorCode, 'MODULE_NOT_FOUND');

// Test 4: Quick fix for "Cannot read properties"
const quickFix = generateQuickFix({ errorMessage: "Cannot read properties of undefined (reading 'name')" });
assert.ok(quickFix, 'Should generate a quick fix');
assert.ok(quickFix.includes('?.'), 'Quick fix should suggest optional chaining');

// Test 5: Quick fix for "is not a function"
const funcFix = generateQuickFix({ errorMessage: 'callback is not a function' });
assert.ok(funcFix, 'Should generate fix for not-a-function');
assert.ok(funcFix.includes('typeof'), 'Should suggest typeof check');

// Test 6: Quick fix for missing module
const modFix = generateQuickFix({ errorMessage: "Cannot find module 'lodash'" });
assert.ok(modFix, 'Should generate fix for missing module');
assert.ok(modFix.includes('npm install'), 'Should suggest npm install');

// Test 7: Full explanation generates valid markdown
const result = explainError(typeError);
assert.ok(result.explanation.includes('Error Explanation'), 'Should have explanation header');
assert.ok(result.explanation.includes('What Happened'), 'Should explain what happened');
assert.ok(result.explanation.includes('How to Fix'), 'Should have fix suggestions');

console.log('  ✅ error_explainer: All tests passed');
