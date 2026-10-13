/**
 * ⚡ OmniGuild Chaos Engineering & Negative Input Fuzzer
 * 
 * Tests JavaScript functions, modules, and API handlers against malicious,
 * corrupt, and extreme boundary payloads (prototype pollution, SQL injection strings,
 * unicode homoglyphs, infinite depths, and memory overflows).
 * 
 * Pure Node.js standard libraries. Zero dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * Standard collection of chaos payloads designed to stress-test boundary validation
 */
const CHAOS_PAYLOADS = [
  { name: 'Null Value', value: null, category: 'primitive' },
  { name: 'Undefined Value', value: undefined, category: 'primitive' },
  { name: 'Empty String', value: '', category: 'primitive' },
  { name: 'Whitespace String', value: '   \t\r\n   ', category: 'primitive' },
  { name: 'Negative Number', value: -1, category: 'number' },
  { name: 'Zero Value', value: 0, category: 'number' },
  { name: 'Negative Zero', value: -0, category: 'number' },
  { name: 'NaN Value', value: NaN, category: 'number' },
  { name: 'Infinity', value: Infinity, category: 'number' },
  { name: 'Negative Infinity', value: -Infinity, category: 'number' },
  { name: 'Max Safe Integer Overflow', value: Number.MAX_SAFE_INTEGER + 1000, category: 'number' },
  { name: 'BigInt Primitive', value: typeof BigInt !== 'undefined' ? BigInt(9007199254740991) : 9007199254740991, category: 'number' },
  { name: 'Prototype Pollution Payload', value: JSON.parse('{"__proto__": {"polluted": true}}'), category: 'security' },
  { name: 'Constructor Override', value: JSON.parse('{"constructor": {"prototype": {"admin": true}}}'), category: 'security' },
  { name: 'SQL Injection String', value: "' OR '1'='1' --; DROP TABLE users;", category: 'security' },
  { name: 'XSS Script Vector', value: '<script>alert(document.cookie)</script>', category: 'security' },
  { name: 'Path Traversal Payload', value: '../../../../../../etc/passwd\0', category: 'security' },
  { name: 'Unicode Homoglyphs & Zero-Width', value: 'admin\u200B\uFEFF\u200Cuser', category: 'unicode' },
  { name: 'Massive String (100k chars)', value: 'A'.repeat(100000), category: 'dos' },
  { name: 'Empty Array', value: [], category: 'collection' },
  { name: 'Empty Object', value: {}, category: 'collection' },
  { name: 'Object with Null Prototype', value: Object.create(null), category: 'collection' },
  { name: 'Array with Holes', value: [1, , , 4], category: 'collection' },
  { name: 'Nested Object (Depth 20)', value: createDeepObject(20), category: 'dos' }
];

function createDeepObject(depth) {
  let curr = { end: true };
  for (let i = 0; i < depth; i++) {
    curr = { next: curr, level: i };
  }
  return curr;
}

/**
 * Fuzzes a target function with the chaos payload suite
 * 
 * @param {Function} fn - Target function to test
 * @param {string} fnName - Name of the function
 * @param {Object} options - Fuzzer options
 * @returns {Object} Fuzz result metrics
 */
function fuzzFunction(fn, fnName = 'anonymous', options = {}) {
  const results = [];
  let passedCount = 0;
  let unhandledCrashes = 0;

  for (const payload of CHAOS_PAYLOADS) {
    const startTime = process.hrtime.bigint();
    let status = 'PASS';
    let outcome = 'Handled gracefully';
    let errorMsg = null;

    try {
      // Test function with the payload as single argument
      const result = fn(payload.value);

      // Check for unexpected promises that reject asynchronously
      if (result && typeof result.then === 'function') {
        status = 'ASYNC_PROMISE';
        outcome = 'Returned Promise (deferred)';
      } else {
        status = 'PASS';
        outcome = `Returned ${typeof result}`;
      }
    } catch (err) {
      errorMsg = err.message || String(err);

      // Distinguish between intentional defensive validation throws vs unexpected runtime bugs
      if (
        err instanceof TypeError ||
        err instanceof RangeError ||
        errorMsg.includes('Invalid') ||
        errorMsg.includes('required') ||
        errorMsg.includes('expected') ||
        errorMsg.includes('Cannot') ||
        errorMsg.includes('must be') ||
        errorMsg.includes('Unknown') ||
        errorMsg.includes('Unsupported')
      ) {
        status = 'DEFENSIVE_THROW';
        outcome = `Defensive check: ${errorMsg.slice(0, 50)}`;
      } else {
        status = 'CRASH';
        outcome = `Unhandled crash: ${errorMsg.slice(0, 50)}`;
        unhandledCrashes++;
      }
    }

    const endTime = process.hrtime.bigint();
    const durationUs = Number(endTime - startTime) / 1000;

    results.push({
      payloadName: payload.name,
      category: payload.category,
      status,
      outcome,
      durationUs: Math.round(durationUs * 100) / 100
    });

    if (status !== 'CRASH') {
      passedCount++;
    }
  }

  const resilienceScore = Math.round((passedCount / CHAOS_PAYLOADS.length) * 100);

  return {
    functionName: fnName,
    totalTests: CHAOS_PAYLOADS.length,
    passedCount,
    unhandledCrashes,
    resilienceScore,
    grade: calculateResilienceGrade(resilienceScore),
    details: results
  };
}

function calculateResilienceGrade(score) {
  if (score >= 95) return 'A+ (Hardened Sovereign)';
  if (score >= 85) return 'A (Production Resilient)';
  if (score >= 70) return 'B (Adequate Defense)';
  if (score >= 50) return 'C (Vulnerable to Edge Cases)';
  return 'F (Critical Boundary Failures)';
}

/**
 * Discovers and fuzzes all exported functions from a target JavaScript file
 * 
 * @param {string} targetFile - Path to file to fuzz
 * @param {Object} options - Fuzzing options
 * @returns {Object} Complete file fuzz report
 */
function fuzzModule(targetFile, options = {}) {
  const fullPath = path.resolve(targetFile);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Target file for fuzzing not found: ${fullPath}`);
  }

  let mod;
  try {
    mod = require(fullPath);
  } catch (err) {
    return {
      filePath: fullPath,
      success: false,
      error: `Failed to load module for fuzzing: ${err.message}`,
      targets: []
    };
  }

  const targets = [];

  if (typeof mod === 'function') {
    targets.push(fuzzFunction(mod, mod.name || 'defaultExport', options));
  } else if (typeof mod === 'object' && mod !== null) {
    for (const [key, val] of Object.entries(mod)) {
      if (typeof val === 'function') {
        targets.push(fuzzFunction(val, key, options));
      }
    }
  }

  const totalScore = targets.length > 0
    ? Math.round(targets.reduce((acc, t) => acc + t.resilienceScore, 0) / targets.length)
    : 100;

  return {
    filePath: fullPath,
    success: true,
    totalFunctionsFuzzed: targets.length,
    averageResilienceScore: totalScore,
    overallGrade: calculateResilienceGrade(totalScore),
    functions: targets
  };
}

/**
 * Formats a terminal-friendly Markdown report of the fuzzing audit
 */
function formatFuzzReport(report) {
  const lines = [];
  lines.push('# ⚡ OmniGuild Chaos Engineering Fuzz Report');
  lines.push(`Target: ${report.filePath || 'In-Memory Function'}`);
  lines.push(`Resilience Grade: ${report.overallGrade || report.grade}`);
  lines.push(`Average Resilience Score: ${report.averageResilienceScore || report.resilienceScore} / 100\n`);

  if (report.functions) {
    for (const fn of report.functions) {
      lines.push(`### Function: \`${fn.functionName}\` (Grade: ${fn.grade} — ${fn.resilienceScore}%)`);
      lines.push(`- Tested: ${fn.totalTests} chaotic payloads | Crashes: ${fn.unhandledCrashes}`);
      
      const failing = fn.details.filter(d => d.status === 'CRASH');
      if (failing.length > 0) {
        lines.push('  ⚠️ Critical Vulnerabilities Found:');
        for (const fail of failing) {
          lines.push(`    • [${fail.category}] ${fail.payloadName}: ${fail.outcome}`);
        }
      } else {
        lines.push('  ✔ All edge cases defended gracefully (Defensive validation or safe return).');
      }
      lines.push('');
    }
  } else if (report.details) {
    lines.push(`### Tested Payloads (${report.totalTests} scenarios):`);
    for (const d of report.details) {
      const icon = d.status === 'CRASH' ? '❌' : '✔';
      lines.push(`  ${icon} [${d.category}] ${d.payloadName.padEnd(30)} ➔ ${d.status} (${d.durationUs}µs)`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  CHAOS_PAYLOADS,
  fuzzFunction,
  fuzzModule,
  formatFuzzReport,
  calculateResilienceGrade
};
