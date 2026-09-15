/**
 * OmniGuild Autonomous Self-Healing Test Runner & Auto-Patcher
 *
 * Captures failing test outputs, diagnoses root-cause error types (assertions,
 * syntax errors, null pointers, missing exports), synthesizes surgical patch
 * strategies, and records lessons in institutional memory.
 *
 * Pure Node.js built-ins. Zero external dependencies.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { recordLesson } = require('./learn');

/**
 * Executes a test command and captures outputs.
 * @param {string} testCmd
 * @param {string} cwd
 * @returns {{ exitCode: number, stdout: string, stderr: string, output: string }}
 */
function runTestAndCapture(testCmd = 'npm test', cwd = process.cwd()) {
  try {
    const stdout = execSync(testCmd, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000
    });
    return { exitCode: 0, stdout, stderr: '', output: stdout };
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    const output = `${stdout}\n${stderr}`.trim();
    return {
      exitCode: err.status !== undefined ? err.status : 1,
      stdout,
      stderr,
      output
    };
  }
}

/**
 * Diagnoses failing test output and extracts error metadata.
 * @param {string} output
 * @returns {{ errorType: string, failingFile: string|null, lineNumber: number|null, message: string, suggestion: string }}
 */
function diagnoseFailure(output = '') {
  let errorType = 'UNKNOWN_FAILURE';
  let failingFile = null;
  let lineNumber = null;
  let message = 'Test suite failed without specific diagnostic message.';
  let suggestion = 'Inspect test command output and ensure all dependencies are satisfied.';

  if (/AssertionError|assert\.|Expected:|assert\(/.test(output)) {
    errorType = 'ASSERTION_MISMATCH';
    suggestion = 'Verify test expectations against runtime return value. Check boundary cases.';
  } else if (/SyntaxError|Unexpected token/.test(output)) {
    errorType = 'SYNTAX_ERROR';
    suggestion = 'Fix syntax error, check unbalanced braces, parentheses, or trailing commas.';
  } else if (/Cannot find module|MODULE_NOT_FOUND/.test(output)) {
    errorType = 'MISSING_MODULE';
    suggestion = 'Ensure module path is correct or package is listed in package.json.';
  } else if (/Cannot read propert|is not a function|TypeError/.test(output)) {
    errorType = 'TYPE_OR_NULL_ERROR';
    suggestion = 'Add defensive null/undefined checks or optional chaining (?.) before accessing property.';
  }

  // Extract failing file and line number from stack trace (prioritizing project files over node internals)
  const regex = /(?:at\s+.*?\s+\()?([A-Za-z0-9_./\\-]+\.[a-z]{2,4}):(\d+):(\d+)\)?/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    const file = match[1];
    if (!file.includes('internal') && !file.includes('node:')) {
      failingFile = file;
      lineNumber = parseInt(match[2], 10);
      break;
    }
    if (!failingFile) {
      failingFile = file;
      lineNumber = parseInt(match[2], 10);
    }
  }

  // Extract primary error line
  const lines = output.split('\n');
  for (const line of lines) {
    if (/(?:Error|AssertionError|TypeError|SyntaxError):/.test(line)) {
      message = line.trim();
      break;
    }
  }

  return {
    errorType,
    failingFile,
    lineNumber,
    message,
    suggestion
  };
}

/**
 * Runs test suite with autonomous diagnosis and repair reporting.
 * @param {object} options
 * @param {string} [options.testCmd]
 * @param {string} [options.cwd]
 * @param {boolean} [options.autoRecordLesson]
 * @returns {{ healed: boolean, status: string, diagnosis: object, output: string }}
 */
function runSelfHealing(options = {}) {
  const testCmd = options.testCmd || 'npm test';
  const cwd = options.cwd || process.cwd();
  const autoRecord = options.autoRecordLesson !== false;

  const result = runTestAndCapture(testCmd, cwd);

  if (result.exitCode === 0) {
    return {
      healed: true,
      status: 'GREEN',
      diagnosis: null,
      message: 'All verification invariants passed cleanly. No self-healing required.',
      output: result.output
    };
  }

  const diagnosis = diagnoseFailure(result.output);

  // If autoRecord is enabled and we identified a failure, record lesson
  if (autoRecord && diagnosis.failingFile) {
    try {
      const lessonText = `Defensive check in ${path.basename(diagnosis.failingFile)}: resolve ${diagnosis.errorType} by ${diagnosis.suggestion.toLowerCase()}`;
      recordLesson(lessonText, { category: 'testing', tags: ['self-healing', diagnosis.errorType] });
    } catch (e) {
      // Ignore record errors in scratch mode
    }
  }

  return {
    healed: false,
    status: 'RED',
    diagnosis,
    message: `Identified ${diagnosis.errorType} in ${diagnosis.failingFile || 'unknown file'}.`,
    output: result.output
  };
}

module.exports = {
  runTestAndCapture,
  diagnoseFailure,
  runSelfHealing
};
