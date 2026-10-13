'use strict';
const assert = require('assert');
const path = require('path');
const {
  calculateCyclomaticComplexity, calculateCognitiveComplexity,
  extractFunctions, analyzeFile, calculateDebtScore,
} = require('../lib/tech_debt_radar');

console.log('  ⏱ tech_debt_radar.test.js');

// Test 1: Simple function has low complexity
const simpleCode = `function greet(name) { return "Hello " + name; }`;
assert.strictEqual(calculateCyclomaticComplexity(simpleCode), 1, 'Simple function should have complexity 1');

// Test 2: Branching increases complexity
const branchCode = `function check(x) { if (x > 0) { return 'pos'; } else if (x < 0) { return 'neg'; } else { return 'zero'; } }`;
const complexity = calculateCyclomaticComplexity(branchCode);
assert.ok(complexity >= 3, `Branch code should have complexity >=3, got ${complexity}`);

// Test 3: Cognitive complexity increases with nesting
const nestedCode = `function deep(a) {\n  if (a) {\n    if (a > 1) {\n      for (var i = 0; i < a; i++) {\n        if (i > 5) break;\n      }\n    }\n  }\n}`;
const cognitive = calculateCognitiveComplexity(nestedCode);
assert.ok(cognitive > 3, `Nested code should have cognitive complexity >3, got ${cognitive}`);

// Test 4: Function extraction
const multiFunc = `function a() { return 1; }\nfunction b() { return 2; }`;
const funcs = extractFunctions(multiFunc);
assert.ok(funcs.length >= 2, `Should extract at least 2 functions, got ${funcs.length}`);

// Test 5: Debt score calculation
const lowDebt = calculateDebtScore({ avgComplexity: 3, maxComplexity: 5, maxNesting: 2, longFunctions: 0, totalLines: 100, commentRatio: 10, functionCount: 5 });
assert.ok(lowDebt <= 15, `Low debt metrics should produce score <=15, got ${lowDebt}`);

const highDebt = calculateDebtScore({ avgComplexity: 15, maxComplexity: 25, maxNesting: 7, longFunctions: 3, totalLines: 600, commentRatio: 1, functionCount: 20 });
assert.ok(highDebt >= 50, `High debt metrics should produce score >=50, got ${highDebt}`);

// Test 6: Analyze file returns expected structure
const thisFile = path.join(__dirname, '..', 'lib', 'tech_debt_radar.js');
const analysis = analyzeFile(thisFile);
assert.ok(analysis, 'Should analyze the file');
assert.ok(analysis.totalLines > 0, 'Should count lines');
assert.ok(analysis.functionCount > 0, 'Should find functions');
assert.ok(typeof analysis.debtScore === 'number', 'Should compute debt score');

console.log('  ✅ tech_debt_radar: All tests passed');
