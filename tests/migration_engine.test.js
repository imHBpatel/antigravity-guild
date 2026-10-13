'use strict';
const assert = require('assert');
const { transformCjsToEsm, transformVarToConst, transformToTemplateLiterals, transformConsoleCleanup, listTransforms, TRANSFORMS } = require('../lib/migration_engine');

console.log('  ⏱ migration_engine.test.js');

// Test 1: CJS → ESM: require → import
const cjsCode = `const fs = require('fs');\nconst path = require('path');`;
const esmResult = transformCjsToEsm(cjsCode);
assert.ok(esmResult.code.includes("import fs from 'fs'"), 'Should convert require to import');
assert.ok(esmResult.code.includes("import path from 'path'"), 'Should convert all requires');
assert.ok(esmResult.changes.length >= 2, 'Should record at least 2 changes');

// Test 2: CJS → ESM: module.exports → export
const exportsCode = `module.exports = { helper, utils };`;
const exportsResult = transformCjsToEsm(exportsCode);
assert.ok(exportsResult.code.includes('export'), 'Should convert module.exports to export');

// Test 3: CJS → ESM: destructured require
const destructCode = `const { join, resolve } = require('path');`;
const destructResult = transformCjsToEsm(destructCode);
assert.ok(destructResult.code.includes('import { join, resolve }'), 'Should convert destructured require');

// Test 4: var → const/let
const varCode = `var x = 1;\nvar y = 2;\ny = 3;`;
const constResult = transformVarToConst(varCode);
assert.ok(constResult.code.includes('const x'), 'Non-reassigned var should become const');
assert.ok(constResult.code.includes('let y'), 'Reassigned var should become let');

// Test 5: Template literals
const concatCode = `var msg = "Hello " + name + "!";`;
const templateResult = transformToTemplateLiterals(concatCode);
assert.ok(templateResult.changes.length > 0 || templateResult.code.includes('`'),
  'Should attempt template literal conversion');

// Test 6: Console cleanup
const logCode = `console.log('debug info');\nconsole.error('real error');\nconsole.log('more debug');`;
const cleanResult = transformConsoleCleanup(logCode);
assert.ok(cleanResult.code.includes('// console.log'), 'Should comment out console.log');
assert.ok(cleanResult.code.includes("console.error('real error')"), 'Should preserve console.error');

// Test 7: TRANSFORMS registry has all built-in transforms
assert.ok(TRANSFORMS['cjs-to-esm'], 'Should have cjs-to-esm');
assert.ok(TRANSFORMS['var-to-const'], 'Should have var-to-const');
assert.ok(TRANSFORMS['template-literals'], 'Should have template-literals');
assert.ok(TRANSFORMS['callback-to-async'], 'Should have callback-to-async');
assert.ok(TRANSFORMS['strict-mode'], 'Should have strict-mode');
assert.ok(TRANSFORMS['console-cleanup'], 'Should have console-cleanup');

console.log('  ✅ migration_engine: All tests passed');
