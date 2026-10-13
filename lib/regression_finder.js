/**
 * Superpower 33: Git Bisect Automator & Regression Finder
 * 
 * Inspired by git bisect, Bugdar.
 * Wraps git bisect with intelligent automation — auto-detect the
 * failing test, run binary search across commits, and pinpoint
 * the exact commit that introduced a regression.
 * 
 * Zero external dependencies — pure Node.js built-ins only.
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

// ── Git Helpers ────────────────────────────────────────────────────────
/**
 * Execute a git command in the project directory.
 */
function git(projectRoot, args, options = {}) {
  try {
    return execSync(`git ${args}`, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: options.timeout || 30000,
      stdio: options.stdio || 'pipe',
    }).trim();
  } catch (err) {
    if (options.throwOnError !== false) throw err;
    return err.stderr || err.stdout || err.message || '';
  }
}

/**
 * Check if we're inside a git repository.
 */
function isGitRepo(projectRoot) {
  try {
    git(projectRoot, 'rev-parse --is-inside-work-tree');
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Get the current HEAD commit SHA.
 */
function getCurrentCommit(projectRoot) {
  return git(projectRoot, 'rev-parse HEAD');
}

/**
 * Get a list of recent commits.
 * @param {number} count — number of commits to retrieve
 */
function getRecentCommits(projectRoot, count = 50) {
  const log = git(projectRoot, `log --oneline -n ${count} --format="%H|%h|%s|%an|%ai"`);
  return log.split('\n').filter(Boolean).map(line => {
    const [hash, short, subject, author, date] = line.split('|');
    return { hash, short, subject, author, date };
  });
}

/**
 * Get the commit diff summary.
 */
function getCommitDiff(projectRoot, commitHash) {
  try {
    const stat = git(projectRoot, `diff-tree --no-commit-id --name-status -r ${commitHash}`);
    const message = git(projectRoot, `log -1 --format="%B" ${commitHash}`);
    return { stat, message };
  } catch (_) {
    return { stat: '', message: '' };
  }
}

// ── Test Runner ────────────────────────────────────────────────────────
/**
 * Run a test command and return pass/fail status.
 */
function runTestCommand(projectRoot, testCommand, timeout = 60000) {
  try {
    execSync(testCommand, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout,
      stdio: 'pipe',
    });
    return { passed: true, output: '' };
  } catch (err) {
    return {
      passed: false,
      output: (err.stdout || '') + '\n' + (err.stderr || ''),
      exitCode: err.status,
    };
  }
}

// ── Bisect Logic ───────────────────────────────────────────────────────
/**
 * Find the last known good commit by binary searching backwards.
 * This is the "auto-detect good commit" feature.
 */
function findLastGoodCommit(projectRoot, testCommand, maxLookback = 30) {
  const commits = getRecentCommits(projectRoot, maxLookback);
  
  if (commits.length < 2) {
    return null;
  }

  // Start from older commits and work forward
  // Use exponential jumps first, then binary search
  const checkpoints = [
    Math.min(commits.length - 1, 5),
    Math.min(commits.length - 1, 10),
    Math.min(commits.length - 1, 20),
    commits.length - 1,
  ];

  let lastGoodIdx = -1;
  const originalHead = getCurrentCommit(projectRoot);

  try {
    for (const idx of checkpoints) {
      const commit = commits[idx];
      git(projectRoot, `checkout ${commit.hash} --quiet`, { throwOnError: false });
      const result = runTestCommand(projectRoot, testCommand);
      
      if (result.passed) {
        lastGoodIdx = idx;
        break;
      }
    }

    // Restore HEAD
    git(projectRoot, `checkout ${originalHead} --quiet`, { throwOnError: false });

    return lastGoodIdx >= 0 ? commits[lastGoodIdx] : null;
  } catch (_) {
    // Always try to restore HEAD
    try { git(projectRoot, `checkout ${originalHead} --quiet`, { throwOnError: false }); }
    catch (__) { /* best effort */ }
    return null;
  }
}

/**
 * Run the bisect algorithm to find the first bad commit.
 * 
 * @param {string} projectRoot — project directory
 * @param {string} testCommand — test command to run
 * @param {string} goodCommit — known good commit hash
 * @param {string} badCommit — known bad commit hash (default: HEAD)
 * @returns {{ culprit: Object, steps: Array, report: string }}
 */
function runBisect(projectRoot, testCommand, goodCommit, badCommit = 'HEAD') {
  if (!isGitRepo(projectRoot)) {
    return {
      success: false,
      report: '# 🎯 Regression Finder\n\n❌ Not a git repository.',
      culprit: null,
      steps: [],
    };
  }

  const originalHead = getCurrentCommit(projectRoot);
  const steps = [];
  let culprit = null;

  try {
    // Get the commit range
    const rangeLog = git(projectRoot,
      `rev-list --ancestry-path ${goodCommit}..${badCommit} --reverse`
    );
    const commitRange = rangeLog.split('\n').filter(Boolean);

    if (commitRange.length === 0) {
      return {
        success: false,
        report: '# 🎯 Regression Finder\n\n❌ No commits found between good and bad.',
        culprit: null,
        steps: [],
      };
    }

    // Binary search
    let lo = 0;
    let hi = commitRange.length - 1;

    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const commit = commitRange[mid];
      const short = commit.substring(0, 8);

      // Checkout the commit
      git(projectRoot, `checkout ${commit} --quiet`, { throwOnError: false });

      // Run the test
      const result = runTestCommand(projectRoot, testCommand);
      const step = {
        index: mid,
        commit: short,
        fullHash: commit,
        passed: result.passed,
        remaining: hi - lo,
      };
      steps.push(step);

      if (result.passed) {
        lo = mid + 1; // Bug introduced after this commit
      } else {
        hi = mid; // Bug is at or before this commit
      }
    }

    // lo === hi — this is the first bad commit
    const culpritHash = commitRange[lo];
    const commitInfo = git(projectRoot,
      `log -1 --format="%H|%h|%s|%an|%ai" ${culpritHash}`
    );
    const [hash, short, subject, author, date] = commitInfo.split('|');
    const diff = getCommitDiff(projectRoot, culpritHash);

    culprit = { hash, short, subject, author, date, diff };

  } finally {
    // Always restore original HEAD
    try { git(projectRoot, `checkout ${originalHead} --quiet`, { throwOnError: false }); }
    catch (_) { /* best effort */ }
  }

  const report = formatBisectReport(culprit, steps, testCommand, goodCommit);

  return {
    success: !!culprit,
    culprit,
    steps,
    report,
  };
}

// ── Report Formatting ──────────────────────────────────────────────────
/**
 * Format the bisect results as Markdown.
 */
function formatBisectReport(culprit, steps, testCommand, goodCommit) {
  const lines = [];

  lines.push('# 🎯 OmniGuild Regression Finder Report');
  lines.push('');

  if (!culprit) {
    lines.push('❌ Could not identify the regression commit.');
    return lines.join('\n');
  }

  lines.push('## 🔴 Regression Commit Found!');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|:---|:---|`);
  lines.push(`| **Commit** | \`${culprit.short}\` (\`${culprit.hash}\`) |`);
  lines.push(`| **Author** | ${culprit.author} |`);
  lines.push(`| **Date** | ${culprit.date} |`);
  lines.push(`| **Subject** | ${culprit.subject} |`);
  lines.push('');

  // Changed files
  if (culprit.diff && culprit.diff.stat) {
    lines.push('### Files Changed in This Commit');
    lines.push('```');
    lines.push(culprit.diff.stat);
    lines.push('```');
    lines.push('');
  }

  // Commit message
  if (culprit.diff && culprit.diff.message) {
    lines.push('### Commit Message');
    lines.push('```');
    lines.push(culprit.diff.message.trim());
    lines.push('```');
    lines.push('');
  }

  // Bisect timeline
  lines.push('## 📊 Bisect Steps');
  lines.push('');
  
  // ASCII timeline
  const timelineChars = steps.map(s => s.passed ? '🟢' : '🔴');
  lines.push(`Timeline: ${timelineChars.join(' → ')}`);
  lines.push('');
  
  lines.push('| Step | Commit | Result | Remaining |');
  lines.push('|:---:|:---|:---:|:---:|');
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const icon = s.passed ? '✅ PASS' : '❌ FAIL';
    lines.push(`| ${i + 1} | \`${s.commit}\` | ${icon} | ${s.remaining} |`);
  }
  lines.push('');

  lines.push(`## Search Stats`);
  lines.push(`- **Test Command:** \`${testCommand}\``);
  lines.push(`- **Good Commit:** \`${goodCommit.substring(0, 8)}\``);
  lines.push(`- **Steps Required:** ${steps.length}`);
  lines.push(`- **Efficiency:** O(log n) binary search`);
  lines.push('');

  lines.push('## 💡 Next Steps');
  lines.push(`1. Review the commit: \`git show ${culprit.short}\``);
  lines.push(`2. Create a reproducer: \`npx omniguild --reproduce "${culprit.subject}"\``);
  lines.push(`3. Fix and verify: \`npx omniguild --verify\``);

  return lines.join('\n');
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Run the regression finder.
 * @param {string} projectRoot — project directory
 * @param {string} testCommand — test command to check pass/fail
 * @param {object} options — { goodCommit, badCommit, autoDetect }
 */
function findRegression(projectRoot, testCommand, options = {}) {
  let goodCommit = options.goodCommit;

  // Auto-detect good commit if not provided
  if (!goodCommit) {
    const found = findLastGoodCommit(projectRoot, testCommand);
    if (!found) {
      return {
        success: false,
        report: '# 🎯 Regression Finder\n\n❌ Could not auto-detect a known-good commit.\nPlease provide one with `--good <commit-hash>`.',
        culprit: null,
        steps: [],
      };
    }
    goodCommit = found.hash;
  }

  return runBisect(
    projectRoot,
    testCommand,
    goodCommit,
    options.badCommit || 'HEAD'
  );
}

module.exports = {
  findRegression,
  runBisect,
  findLastGoodCommit,
  runTestCommand,
  getRecentCommits,
  getCurrentCommit,
  getCommitDiff,
  isGitRepo,
  formatBisectReport,
};
