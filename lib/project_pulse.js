/**
 * Superpower 35: Project Pulse & Health Dashboard
 * 
 * Inspired by CodeScene, LinearB, DORA metrics.
 * A single-command "vital signs" dashboard combining code health,
 * memory freshness, dependency safety, test coverage estimation,
 * and git velocity — the ultimate project health check.
 * 
 * Zero external dependencies — pure Node.js built-ins only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Metric Collectors ──────────────────────────────────────────────────
/**
 * Collect code health metrics (lightweight version of tech_debt_radar).
 */
function collectCodeHealth(projectRoot) {
  const sourceFiles = collectFiles(projectRoot, ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs']);
  
  let totalLines = 0;
  let totalFiles = 0;
  let totalComplexity = 0;
  let complexFunctions = 0;
  let maxFileSize = 0;
  let largestFile = '';

  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      totalLines += lines;
      totalFiles++;

      if (lines > maxFileSize) {
        maxFileSize = lines;
        largestFile = path.relative(projectRoot, file);
      }

      // Quick complexity estimate via decision point counting
      const decisions = (content.match(/\b(if|else if|while|for|case|catch|&&|\|\|)\b/g) || []).length;
      totalComplexity += decisions;
      if (decisions > 20) complexFunctions++;
    } catch (_) { /* skip */ }
  }

  const avgComplexity = totalFiles > 0 ? Math.round(totalComplexity / totalFiles) : 0;
  const score = calculateHealthScore(avgComplexity, maxFileSize, totalFiles);

  return {
    totalFiles,
    totalLines,
    avgComplexity,
    complexFileCount: complexFunctions,
    maxFileSize,
    largestFile,
    score,
    grade: scoreToGrade(score),
  };
}

/**
 * Collect memory freshness metrics.
 */
function collectMemoryHealth(projectRoot) {
  const memoryFiles = [
    path.join(projectRoot, '.openguild', 'team_memory.md'),
    path.join(require('os').homedir(), '.openguild', 'memory', 'institutional_memory.md'),
  ];

  let totalEntries = 0;
  let entriesWithDates = 0;
  let staleEntries = 0;
  const now = new Date();
  const staleThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days

  for (const memFile of memoryFiles) {
    try {
      if (!fs.existsSync(memFile)) continue;
      const content = fs.readFileSync(memFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

      for (const line of lines) {
        totalEntries++;
        const dateMatch = line.match(/\[(\d{4}-\d{2}-\d{2})\]/);
        if (dateMatch) {
          entriesWithDates++;
          const entryDate = new Date(dateMatch[1]);
          if ((now - entryDate) > staleThreshold) {
            staleEntries++;
          }
        }
      }
    } catch (_) { /* skip */ }
  }

  const freshness = totalEntries > 0
    ? Math.round(((totalEntries - staleEntries) / totalEntries) * 100)
    : 0;

  return {
    entries: totalEntries,
    totalEntries,
    staleEntries,
    freshEntries: totalEntries - staleEntries,
    freshness,
    grade: freshness >= 80 ? 'A' : freshness >= 60 ? 'B' : freshness >= 40 ? 'C' : freshness >= 20 ? 'D' : 'F',
  };
}

/**
 * Collect security audit metrics (lightweight scan).
 */
function collectSecurityHealth(projectRoot) {
  const sourceFiles = collectFiles(projectRoot, ['.js', '.ts', '.py', '.go', '.env']);
  let issues = 0;
  const findings = [];

  const patterns = [
    { pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi, label: 'Hardcoded Secret' },
    { pattern: new RegExp('eval\\s*\\(', 'g'), label: 'Dangerous eval()' },
    { pattern: /\bexec\s*\(\s*[`'"]/g, label: 'Shell Injection Risk' },
  ];

  for (const file of sourceFiles) {
    try {
      if (file.includes('node_modules')) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const { pattern, label } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          issues += matches.length;
          findings.push({ file: path.relative(projectRoot, file), type: label, count: matches.length });
        }
      }
    } catch (_) { /* skip */ }
  }

  const grade = issues === 0 ? 'A+' : issues <= 2 ? 'B' : issues <= 5 ? 'C' : issues <= 10 ? 'D' : 'F';
  const score = Math.max(0, 100 - issues * 15);

  return {
    score,
    issueCount: issues,
    findings: findings.slice(0, 10),
    grade,
  };
}

/**
 * Collect dependency health metrics.
 */
function collectDependencyHealth(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { directDeps: 0, depCount: 0, devDepCount: 0, grade: 'N/A', hasLockfile: false };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = Object.keys(pkg.dependencies || {}).length;
    const devDeps = Object.keys(pkg.devDependencies || {}).length;
    const hasLock = fs.existsSync(path.join(projectRoot, 'package-lock.json'));
    const hasYarnLock = fs.existsSync(path.join(projectRoot, 'yarn.lock'));

    // Penalize if no lockfile
    let grade = 'A';
    if (!hasLock && !hasYarnLock) grade = 'C';
    if (deps > 50) grade = grade === 'A' ? 'B' : grade;
    if (deps > 100) grade = 'C';

    return {
      directDeps: deps,
      depCount: deps,
      devDepCount: devDeps,
      totalDeps: deps + devDeps,
      hasLockfile: hasLock || hasYarnLock,
      grade,
    };
  } catch (_) {
    return { directDeps: 0, depCount: 0, devDepCount: 0, grade: 'N/A', hasLockfile: false };
  }
}

/**
 * Collect git velocity metrics.
 */
function collectGitVelocity(projectRoot) {
  try {
    // Commits in last 7 days
    const weekCommits = execSync(
      'git log --oneline --since="7 days ago"',
      { cwd: projectRoot, encoding: 'utf8', timeout: 5000 }
    ).split('\n').filter(Boolean).length;

    // Commits in last 30 days
    const monthCommits = execSync(
      'git log --oneline --since="30 days ago"',
      { cwd: projectRoot, encoding: 'utf8', timeout: 5000 }
    ).split('\n').filter(Boolean).length;

    // Active contributors in last 30 days
    const contributors = execSync(
      'git log --format="%an" --since="30 days ago"',
      { cwd: projectRoot, encoding: 'utf8', timeout: 5000 }
    ).split('\n').filter(Boolean);
    const uniqueContributors = new Set(contributors).size;

    // Last commit date
    const lastCommit = execSync(
      'git log -1 --format="%ai"',
      { cwd: projectRoot, encoding: 'utf8', timeout: 5000 }
    ).trim();

    // Branch count
    const branches = execSync(
      'git branch --list',
      { cwd: projectRoot, encoding: 'utf8', timeout: 5000 }
    ).split('\n').filter(Boolean).length;

    const weeklyRate = weekCommits;
    const grade = weeklyRate >= 10 ? 'A+' : weeklyRate >= 5 ? 'A' :
      weeklyRate >= 2 ? 'B' : weeklyRate >= 1 ? 'C' : 'D';

    return {
      commitsThisWeek: weekCommits,
      commitsThisMonth: monthCommits,
      uniqueContributors,
      lastCommit,
      branches,
      grade,
    };
  } catch (_) {
    return {
      commitsThisWeek: 0, commitsThisMonth: 0,
      uniqueContributors: 0, lastCommit: 'N/A',
      branches: 0, grade: 'N/A',
    };
  }
}

/**
 * Collect test health metrics.
 */
function collectTestHealth(projectRoot) {
  const testDirs = ['tests', 'test', '__tests__', 'spec'];
  const srcExts = ['.js', '.ts', '.jsx', '.tsx'];
  let testFiles = 0;
  let sourceFiles = 0;

  // Count source files
  const srcFiles = collectFiles(projectRoot, srcExts);
  sourceFiles = srcFiles.filter(f => 
    !f.includes('test') && !f.includes('spec') && !f.includes('__tests__')
  ).length;

  // Count test files
  for (const dir of testDirs) {
    const testDir = path.join(projectRoot, dir);
    if (fs.existsSync(testDir)) {
      testFiles += collectFiles(testDir, srcExts).length;
    }
  }

  // Also count *.test.* and *.spec.* files anywhere
  const allFiles = collectFiles(projectRoot, srcExts);
  const testPatternFiles = allFiles.filter(f => 
    /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(f)
  ).length;
  testFiles = Math.max(testFiles, testPatternFiles);

  const ratio = sourceFiles > 0 ? Math.round((testFiles / sourceFiles) * 100) : 0;
  const grade = ratio >= 80 ? 'A+' : ratio >= 60 ? 'A' :
    ratio >= 40 ? 'B' : ratio >= 20 ? 'C' : ratio >= 5 ? 'D' : 'F';

  return {
    testFiles,
    sourceFiles,
    ratio,
    grade,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────
function collectFiles(dir, extensions, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return [];
  const files = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor', '__pycache__']);

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.has(entry.name) || (entry.isDirectory() && entry.name.startsWith('.'))) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectFiles(fullPath, extensions, maxDepth, depth + 1));
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) files.push(fullPath);
      }
    }
  } catch (_) { /* skip */ }
  return files;
}

function calculateHealthScore(avgComplexity, maxFileSize, totalFiles) {
  let score = 100;
  if (avgComplexity > 15) score -= 30;
  else if (avgComplexity > 10) score -= 20;
  else if (avgComplexity > 5) score -= 10;

  if (maxFileSize > 500) score -= 15;
  else if (maxFileSize > 300) score -= 8;

  return Math.max(0, score);
}

function scoreToGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Generate ASCII sparkline from an array of values.
 */
function sparkline(values) {
  if (values.length === 0) return '';
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map(v => {
    const idx = Math.round(((v - min) / range) * (chars.length - 1));
    return chars[idx];
  }).join('');
}

// ── Report Formatting ──────────────────────────────────────────────────
/**
 * Format the Project Pulse report.
 */
function formatPulseReport(metrics) {
  const lines = [];
  const { code, memory, security, deps, git, tests } = metrics;

  // Overall pulse
  const grades = [code.grade, memory.grade, security.grade, deps.grade, git.grade, tests.grade]
    .filter(g => g !== 'N/A');
  const gradeValues = grades.map(g => {
    const map = { 'A+': 100, 'A': 90, 'B': 75, 'C': 55, 'D': 35, 'F': 15 };
    return map[g] || 50;
  });
  const overallScore = gradeValues.length > 0
    ? Math.round(gradeValues.reduce((s, v) => s + v, 0) / gradeValues.length)
    : 0;
  const overallGrade = scoreToGrade(overallScore);

  lines.push('# 📈 OmniGuild PROJECT PULSE');
  lines.push('');
  lines.push(`## Overall Health: **${overallGrade}** (${overallScore}/100)`);
  lines.push('');

  // Health bar
  const filled = Math.round(overallScore / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  lines.push(`\`[${bar}]\` ${overallScore}%`);
  lines.push('');

  // Vital signs table
  lines.push('## Vital Signs');
  lines.push('| Metric | Grade | Details |');
  lines.push('|:---|:---:|:---|');
  lines.push(`| 📊 **Code Health** | **${code.grade}** | ${code.totalFiles} files, ${code.totalLines} lines, avg complexity ${code.avgComplexity} |`);
  lines.push(`| 🧠 **Memory Freshness** | **${memory.grade}** | ${memory.freshEntries}/${memory.totalEntries} entries fresh (${memory.freshness}%) |`);
  lines.push(`| 🛡️ **Security** | **${security.grade}** | ${security.issueCount} issues detected |`);
  lines.push(`| 📦 **Dependencies** | **${deps.grade}** | ${deps.totalDeps || 0} packages, lockfile: ${deps.hasLockfile ? '✅' : '❌'} |`);
  lines.push(`| 🚀 **Git Velocity** | **${git.grade}** | ${git.commitsThisWeek} commits/week, ${git.uniqueContributors} contributors |`);
  lines.push(`| 🧪 **Test Health** | **${tests.grade}** | ${tests.testFiles} tests / ${tests.sourceFiles} source files (${tests.ratio}% ratio) |`);
  lines.push('');

  // Code details
  lines.push('## 📊 Code Details');
  lines.push(`- **Total Files:** ${code.totalFiles}`);
  lines.push(`- **Total Lines:** ${code.totalLines.toLocaleString()}`);
  lines.push(`- **Largest File:** \`${code.largestFile}\` (${code.maxFileSize} lines)`);
  lines.push(`- **Complex Files (>20 decisions):** ${code.complexFileCount}`);
  lines.push('');

  // Git activity
  if (git.grade !== 'N/A') {
    lines.push('## 🚀 Git Activity');
    lines.push(`- **This Week:** ${git.commitsThisWeek} commits`);
    lines.push(`- **This Month:** ${git.commitsThisMonth} commits`);
    lines.push(`- **Contributors (30d):** ${git.uniqueContributors}`);
    lines.push(`- **Active Branches:** ${git.branches}`);
    lines.push(`- **Last Commit:** ${git.lastCommit}`);
    lines.push('');
  }

  // Security findings
  if (security.issueCount > 0) {
    lines.push('## ⚠️ Security Findings');
    for (const f of security.findings) {
      lines.push(`- 🔴 \`${f.file}\`: ${f.count}x ${f.type}`);
    }
    lines.push('');
  }

  // Recommendations
  lines.push('## 💡 Recommendations');
  const recs = [];
  if (code.grade === 'D' || code.grade === 'F') recs.push('🔧 Run `npx omniguild --debt` to identify refactoring priorities');
  if (memory.staleEntries > 0) recs.push(`🧹 Review ${memory.staleEntries} stale memories with \`npx omniguild --timeline\``);
  if (security.issueCount > 0) recs.push('🛡️ Run `npx omniguild --audit` for detailed security analysis');
  if (!deps.hasLockfile) recs.push('📦 Generate a lockfile with `npm install --package-lock-only`');
  if (tests.ratio < 40) recs.push('🧪 Increase test coverage with `npx omniguild --generate-tests`');
  if (git.commitsThisWeek === 0) recs.push('🚀 No commits this week — check project activity');

  if (recs.length === 0) recs.push('✅ Project is in good health! Keep up the excellent work.');

  for (const rec of recs) {
    lines.push(`- ${rec}`);
  }

  return lines.join('\n');
}

// ── Snapshot Management ────────────────────────────────────────────────
/**
 * Save a pulse snapshot for trend tracking.
 */
function savePulseSnapshot(projectRoot, metrics) {
  const dir = path.join(projectRoot, '.openguild');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const historyPath = path.join(dir, 'pulse_history.json');
  let history = [];

  if (fs.existsSync(historyPath)) {
    try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); }
    catch (_) { history = []; }
  }

  history.push({
    timestamp: new Date().toISOString(),
    code: { grade: metrics.code.grade, files: metrics.code.totalFiles, lines: metrics.code.totalLines },
    memory: { grade: metrics.memory.grade, freshness: metrics.memory.freshness },
    security: { grade: metrics.security.grade, issues: metrics.security.issueCount },
    deps: { grade: metrics.deps.grade },
    git: { grade: metrics.git.grade, weeklyCommits: metrics.git.commitsThisWeek },
    tests: { grade: metrics.tests.grade, ratio: metrics.tests.ratio },
  });

  // Keep last 100 snapshots
  if (history.length > 100) history = history.slice(-100);

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  return history;
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Run the project pulse health check.
 * @param {string} projectRoot — project directory
 * @returns {{ report: string, metrics: Object }}
 */
function runProjectPulse(projectRoot) {
  const metrics = {
    code: collectCodeHealth(projectRoot),
    memory: collectMemoryHealth(projectRoot),
    security: collectSecurityHealth(projectRoot),
    deps: collectDependencyHealth(projectRoot),
    git: collectGitVelocity(projectRoot),
    tests: collectTestHealth(projectRoot),
  };

  const report = formatPulseReport(metrics);

  // Save snapshot for trend tracking
  savePulseSnapshot(projectRoot, metrics);

  return { report, metrics };
}

module.exports = {
  runProjectPulse,
  collectCodeHealth,
  collectMemoryHealth,
  collectSecurityHealth,
  collectDependencyHealth,
  collectGitVelocity,
  collectTestHealth,
  savePulseSnapshot,
  formatPulseReport,
  sparkline,
};
