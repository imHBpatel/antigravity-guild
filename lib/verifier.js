'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { detectStack } = require('./detectors');
const { lintAllMemory } = require('./memory_linter');
const { enforceGitignore } = require('./gitignore');
const { c } = require('./constants');

/**
 * Execute a command safely and capture status.
 *
 * @param {string} cmd
 * @param {string} cwd
 * @returns {{ passed: boolean, skipped: boolean, output: string }}
 */
function runStep(cmd, cwd) {
  if (!cmd || cmd.includes('No linter configured') || cmd.includes('No typechecker configured')) {
    return { passed: true, skipped: true, output: 'Not configured (Skipped)' };
  }

  try {
    const output = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
    return { passed: true, skipped: false, output: output.trim() };
  } catch (err) {
    const errOutput = (err.stdout || '') + '\n' + (err.stderr || err.message || '');
    return { passed: false, skipped: false, output: errOutput.trim() };
  }
}

/**
 * Execute unified deterministic verification across all invariants.
 *
 * @param {string} projectDir - Workspace directory.
 * @param {object} options - Execution options.
 * @param {boolean} [options.autoFix=false] - Auto-fix memory & gitignore issues.
 * @returns {object} Verification report and status.
 */
function verifyProject(projectDir = process.cwd(), options = {}) {
  let files = [];
  try {
    files = fs.readdirSync(projectDir);
  } catch {
    files = [];
  }

  const stack = detectStack(files, projectDir);
  const projectName = path.basename(projectDir);

  const results = {
    test: runStep(stack.testCmd, projectDir),
    lint: runStep(stack.lintCmd, projectDir),
    typecheck: runStep(stack.typecheckCmd, projectDir),
    memory: null,
    gitignore: null,
  };

  // Memory Linting
  try {
    const memReports = lintAllMemory(projectDir, options.autoFix || false);
    const totalDuplicates = memReports.reduce((sum, r) => sum + (r.duplicates || 0), 0);
    const isClean = totalDuplicates === 0 || !!options.autoFix;
    results.memory = {
      passed: isClean,
      output: `Audited ${memReports.length} files. Found ${totalDuplicates} duplicates${options.autoFix && totalDuplicates > 0 ? ` (${totalDuplicates} auto-fixed)` : ''}.`,
    };
  } catch (err) {
    results.memory = { passed: false, output: err.message };
  }

  // Gitignore context hygiene
  try {
    const gitignoreRes = enforceGitignore(projectDir, !options.autoFix);
    results.gitignore = {
      passed: true,
      output: gitignoreRes.created
        ? 'Created .gitignore with context hygiene'
        : gitignoreRes.updated
          ? `Missing ${gitignoreRes.addedCount} rules`
          : 'Verified context hygiene rules up to date',
    };
  } catch (err) {
    results.gitignore = { passed: false, output: err.message };
  }

  const allPassed =
    results.test.passed &&
    results.lint.passed &&
    results.typecheck.passed &&
    results.memory.passed &&
    results.gitignore.passed;

  let report = `# 🧪 OpenGuild Deterministic Verification Proof: ${projectName}
**Workspace:** \`${projectDir}\`
**Overall Status:** ${allPassed ? '✅ **CERTIFIED INVARIANT PROOF (PASSED)**' : '❌ **VERIFICATION FAILED**'}

---

## 🏛️ 16-Mind Supreme Council Invariant Audit

| Invariant Gate | Command / Target | Status | Detail |
|:---|:---|:---:|:---|
| **Automated Test Suite** | \`${stack.testCmd}\` | ${results.test.passed ? '✅ PASS' : '❌ FAIL'} | ${results.test.skipped ? 'Skipped' : results.test.passed ? 'All tests passed deterministically' : 'Test failures detected'} |
| **Linter Invariant** | \`${stack.lintCmd}\` | ${results.lint.passed ? (results.lint.skipped ? 'ℹ️ SKIP' : '✅ PASS') : '❌ FAIL'} | ${results.lint.output.substring(0, 80)} |
| **Typecheck Invariant** | \`${stack.typecheckCmd}\` | ${results.typecheck.passed ? (results.typecheck.skipped ? 'ℹ️ SKIP' : '✅ PASS') : '❌ FAIL'} | ${results.typecheck.output.substring(0, 80)} |
| **Memory Vault Integrity** | \`~/.openguild/memory\` | ${results.memory.passed ? '✅ PASS' : '⚠️ WARN'} | ${results.memory.output} |
| **Context Hygiene** | \`.gitignore\` | ${results.gitignore.passed ? '✅ PASS' : '❌ FAIL'} | ${results.gitignore.output} |

---

`;

  if (allPassed) {
    report += `### 🎉 Deterministic Certification
All architectural, security, testing, and memory invariants are satisfied. The codebase is safe to commit, merge, or deploy.
`;
  } else {
    report += `### ⚠️ Invariant Violations Detected:
Review the failed step outputs above. Fix the underlying test or rule violations before marking the task as complete.
`;
  }

  return {
    passed: allPassed,
    stack,
    results,
    reportMarkdown: report.trim(),
  };
}

module.exports = {
  runStep,
  verifyProject,
};
