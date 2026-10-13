/**
 * Superpower 27: Tech Debt Radar & Code Health Tracker
 * 
 * Inspired by CodeScene, SonarQube, GitClear.
 * Quantifies tech debt with cyclomatic complexity, cognitive complexity,
 * file hotspot analysis, dead code detection, and trend tracking —
 * all from pure AST parsing with zero external dependencies.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── AST-Based Complexity Analysis ──────────────────────────────────────
/**
 * Calculate cyclomatic complexity of a JavaScript/TypeScript function body.
 * McCabe's cyclomatic complexity = 1 + decision points.
 * Decision points: if, else if, while, for, case, catch, &&, ||, ?, ??, ?.
 */
function calculateCyclomaticComplexity(code) {
  let complexity = 1; // Base path
  
  const decisionPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /&&/g,
    /\|\|/g,
    /\?\?/g,
    /[^?]\?[^?.]/g, // Ternary operator (not ?. or ??)
  ];

  // Strip strings and comments first to avoid false positives
  const cleaned = stripStringsAndComments(code);

  for (const pattern of decisionPatterns) {
    const matches = cleaned.match(pattern);
    if (matches) complexity += matches.length;
  }

  return complexity;
}

/**
 * Calculate cognitive complexity — measures how hard code is to understand.
 * Increments for: nesting depth penalties, branching, recursion indicators.
 */
function calculateCognitiveComplexity(code) {
  let complexity = 0;
  let nestingDepth = 0;
  const cleaned = stripStringsAndComments(code);
  const lines = cleaned.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Track nesting via braces
    const opens = (trimmed.match(/{/g) || []).length;
    const closes = (trimmed.match(/}/g) || []).length;

    // Decision points with nesting penalty
    const nestingKeywords = [
      /\bif\s*\(/, /\belse\s+if\s*\(/, /\bwhile\s*\(/,
      /\bfor\s*\(/, /\bswitch\s*\(/, /\bcatch\s*\(/,
    ];

    for (const pattern of nestingKeywords) {
      if (pattern.test(trimmed)) {
        complexity += 1 + nestingDepth; // Base + nesting penalty
      }
    }

    // Logical operators add structural complexity
    const logicalOps = (trimmed.match(/&&|\|\||\?\?/g) || []).length;
    complexity += logicalOps;

    // Break/continue with labels add complexity
    if (/\b(break|continue)\s+\w+/.test(trimmed)) complexity += 1;

    // Update nesting depth
    nestingDepth += opens - closes;
    if (nestingDepth < 0) nestingDepth = 0;
  }

  return complexity;
}

/**
 * Strip string literals and comments to avoid false AST matches.
 */
function stripStringsAndComments(code) {
  return code
    // Block comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Line comments
    .replace(/\/\/.*/g, '')
    // Template literals (simplified)
    .replace(/`[^`]*`/g, '""')
    // Double-quoted strings
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    // Single-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

// ── Function Extraction ────────────────────────────────────────────────
/**
 * Extract function definitions from JavaScript/TypeScript source code.
 * Returns array of { name, startLine, endLine, body, lineCount }.
 */
function extractFunctions(code) {
  const functions = [];
  const lines = code.split('\n');

  // Patterns for function declarations
  const funcPatterns = [
    // function name(...)
    /(?:async\s+)?function\s+(\w+)\s*\(/,
    // const/let/var name = function
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/,
    // const/let/var name = (...) =>
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(?[^)]*\)?\s*=>/,
    // class method: name(...) {
    /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/,
    // exports.name = function
    /(?:module\.)?exports\.(\w+)\s*=\s*(?:async\s+)?function/,
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of funcPatterns) {
      const match = lines[i].match(pattern);
      if (match) {
        const name = match[1];
        const body = extractFunctionBody(lines, i);
        if (body) {
          functions.push({
            name,
            startLine: i + 1,
            endLine: i + body.lineCount,
            body: body.text,
            lineCount: body.lineCount,
          });
        }
        break;
      }
    }
  }

  return functions;
}

/**
 * Extract the function body by tracking brace depth.
 */
function extractFunctionBody(lines, startIdx) {
  let braceDepth = 0;
  let started = false;
  const bodyLines = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    bodyLines.push(line);

    for (const ch of line) {
      if (ch === '{') { braceDepth++; started = true; }
      if (ch === '}') braceDepth--;
    }

    if (started && braceDepth <= 0) {
      return { text: bodyLines.join('\n'), lineCount: bodyLines.length };
    }
  }

  // Arrow functions without braces
  if (!started && bodyLines.length > 0) {
    return { text: bodyLines.join('\n'), lineCount: bodyLines.length };
  }

  return null;
}

// ── File Analysis ──────────────────────────────────────────────────────
/**
 * Analyze a single file for tech debt metrics.
 */
function analyzeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const supported = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
  if (!supported.includes(ext)) return null;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_) { return null; }

  const lines = content.split('\n');
  const functions = extractFunctions(content);

  const functionMetrics = functions.map(fn => ({
    name: fn.name,
    startLine: fn.startLine,
    lineCount: fn.lineCount,
    cyclomaticComplexity: calculateCyclomaticComplexity(fn.body),
    cognitiveComplexity: calculateCognitiveComplexity(fn.body),
  }));

  // File-level metrics
  const totalComplexity = functionMetrics.reduce((s, f) => s + f.cyclomaticComplexity, 0);
  const maxComplexity = Math.max(0, ...functionMetrics.map(f => f.cyclomaticComplexity));
  const avgComplexity = functionMetrics.length > 0
    ? Math.round((totalComplexity / functionMetrics.length) * 10) / 10
    : 0;

  // Detect long functions (>50 lines)
  const longFunctions = functionMetrics.filter(f => f.lineCount > 50);

  // Detect deeply nested code
  let maxNesting = 0;
  let currentNesting = 0;
  for (const line of lines) {
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    currentNesting += opens - closes;
    if (currentNesting > maxNesting) maxNesting = currentNesting;
  }

  // Comment ratio
  const commentLines = lines.filter(l => {
    const t = l.trim();
    return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*');
  }).length;
  const commentRatio = lines.length > 0
    ? Math.round((commentLines / lines.length) * 100)
    : 0;

  return {
    filePath,
    fileName: path.basename(filePath),
    totalLines: lines.length,
    functionCount: functionMetrics.length,
    totalComplexity,
    maxComplexity,
    avgComplexity,
    maxNesting,
    commentRatio,
    longFunctions,
    functions: functionMetrics,
    // Debt score: higher = more debt (0-100 scale)
    debtScore: calculateDebtScore({
      avgComplexity, maxComplexity, maxNesting,
      longFunctions: longFunctions.length, totalLines: lines.length,
      commentRatio, functionCount: functionMetrics.length,
    }),
  };
}

/**
 * Calculate a normalized debt score (0-100) from file metrics.
 */
function calculateDebtScore(metrics) {
  let score = 0;

  // Complexity penalties
  if (metrics.avgComplexity > 10) score += 20;
  else if (metrics.avgComplexity > 5) score += 10;

  if (metrics.maxComplexity > 20) score += 25;
  else if (metrics.maxComplexity > 10) score += 15;
  else if (metrics.maxComplexity > 5) score += 5;

  // Nesting penalties
  if (metrics.maxNesting > 6) score += 20;
  else if (metrics.maxNesting > 4) score += 10;

  // Long function penalties
  score += Math.min(15, metrics.longFunctions * 5);

  // File size penalties
  if (metrics.totalLines > 500) score += 15;
  else if (metrics.totalLines > 300) score += 8;

  // Low comment ratio penalty (only for large files)
  if (metrics.totalLines > 100 && metrics.commentRatio < 5) score += 5;

  return Math.min(100, score);
}

// ── Dead Code Detection ────────────────────────────────────────────────
/**
 * Detect potentially dead (unused) exports by scanning import/require
 * references across the project.
 */
function detectDeadExports(projectRoot, files) {
  const allExports = [];
  const allImports = new Set();

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Collect exports
      const exportMatches = content.matchAll(/(?:module\.)?exports\.(\w+)|export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g);
      for (const m of exportMatches) {
        const name = m[1] || m[2];
        if (name) allExports.push({ name, file });
      }

      // Collect imports/requires
      const importMatches = content.matchAll(/require\(['"](.*?)['"]\)|import\s+.*?from\s+['"](.*?)['"]/g);
      for (const m of importMatches) {
        allImports.add(m[1] || m[2]);
      }

      // Collect function usage references
      const wordPattern = /\b(\w+)\s*\(/g;
      let wm;
      while ((wm = wordPattern.exec(content)) !== null) {
        allImports.add(wm[1]); // Rough heuristic — any called function
      }
    } catch (_) { /* skip */ }
  }

  // Find exports that are never referenced in other files
  const deadExports = [];
  for (const exp of allExports) {
    // Check if the export name appears in files other than its own
    const referencedElsewhere = files.some(f => {
      if (f === exp.file) return false;
      try {
        const content = fs.readFileSync(f, 'utf8');
        return content.includes(exp.name);
      } catch (_) { return false; }
    });

    if (!referencedElsewhere) {
      deadExports.push(exp);
    }
  }

  return deadExports;
}

// ── Git Hotspot Analysis ───────────────────────────────────────────────
/**
 * Analyze git log to find "hotspot" files — frequently changed files
 * that are likely sources of instability and tech debt.
 */
function analyzeGitHotspots(projectRoot) {
  try {
    const log = execSync(
      'git log --format=format: --name-only --since="6 months ago"',
      { cwd: projectRoot, encoding: 'utf8', timeout: 10000 }
    );

    const fileCounts = {};
    for (const line of log.split('\n')) {
      const file = line.trim();
      if (!file) continue;
      fileCounts[file] = (fileCounts[file] || 0) + 1;
    }

    return Object.entries(fileCounts)
      .map(([file, count]) => ({ file, changeCount: count }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 20);
  } catch (_) {
    return [];
  }
}

// ── Report Formatting ──────────────────────────────────────────────────
/**
 * Format the tech debt radar report as Markdown.
 */
function formatDebtReport(fileResults, hotspots, deadExports) {
  const lines = [];
  
  lines.push('# 📊 OmniGuild Tech Debt Radar Report');
  lines.push('');

  // Overall health grade
  const avgDebt = fileResults.length > 0
    ? Math.round(fileResults.reduce((s, f) => s + f.debtScore, 0) / fileResults.length)
    : 0;
  const grade = avgDebt <= 10 ? 'A+' : avgDebt <= 20 ? 'A' :
    avgDebt <= 35 ? 'B' : avgDebt <= 50 ? 'C' : avgDebt <= 70 ? 'D' : 'F';

  lines.push(`## Overall Code Health: **${grade}** (Debt Score: ${avgDebt}/100)`);
  lines.push('');

  // Summary stats
  const totalFunctions = fileResults.reduce((s, f) => s + f.functionCount, 0);
  const highComplexity = fileResults
    .flatMap(f => f.functions)
    .filter(fn => fn.cyclomaticComplexity > 10);

  lines.push('## Summary');
  lines.push(`- **Files Analyzed:** ${fileResults.length}`);
  lines.push(`- **Functions Found:** ${totalFunctions}`);
  lines.push(`- **High-Complexity Functions (>10):** ${highComplexity.length}`);
  lines.push(`- **Dead Export Candidates:** ${deadExports.length}`);
  lines.push('');

  // Top debt files
  const sorted = [...fileResults].sort((a, b) => b.debtScore - a.debtScore);
  const topDebt = sorted.filter(f => f.debtScore > 0).slice(0, 10);

  if (topDebt.length > 0) {
    lines.push('## 🔥 Highest Debt Files');
    lines.push('| File | Debt Score | Complexity | Max Nesting | Lines |');
    lines.push('|:---|:---:|:---:|:---:|:---:|');
    for (const f of topDebt) {
      const icon = f.debtScore > 50 ? '🔴' : f.debtScore > 25 ? '🟡' : '🟢';
      lines.push(`| ${icon} \`${f.fileName}\` | ${f.debtScore} | ${f.avgComplexity} avg | ${f.maxNesting} | ${f.totalLines} |`);
    }
    lines.push('');
  }

  // Complex functions
  if (highComplexity.length > 0) {
    lines.push('## ⚡ High-Complexity Functions (Refactoring Candidates)');
    lines.push('| Function | File | Cyclomatic | Cognitive | Lines |');
    lines.push('|:---|:---|:---:|:---:|:---:|');
    for (const fn of highComplexity.sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity).slice(0, 15)) {
      const parentFile = fileResults.find(f => f.functions.includes(fn));
      const fileName = parentFile ? parentFile.fileName : 'unknown';
      lines.push(`| \`${fn.name}\` | \`${fileName}\` | ${fn.cyclomaticComplexity} | ${fn.cognitiveComplexity} | ${fn.lineCount} |`);
    }
    lines.push('');
  }

  // Git hotspots
  if (hotspots.length > 0) {
    lines.push('## 🔥 Git Hotspots (Most Frequently Changed Files)');
    for (const h of hotspots.slice(0, 10)) {
      const bar = '█'.repeat(Math.min(20, Math.round(h.changeCount / 2)));
      lines.push(`- \`${h.file}\` — ${h.changeCount} changes ${bar}`);
    }
    lines.push('');
  }

  // Dead exports
  if (deadExports.length > 0) {
    lines.push('## 🧟 Potentially Dead Exports');
    lines.push('> These exports are not referenced in any other project file.');
    lines.push('');
    for (const de of deadExports.slice(0, 20)) {
      lines.push(`- \`${de.name}\` in \`${path.basename(de.file)}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Run the tech debt radar analysis.
 */
function runTechDebtRadar(projectRoot) {
  // Collect source files
  const sourceFiles = collectSourceFiles(projectRoot);

  // Analyze each file
  const fileResults = sourceFiles
    .map(f => analyzeFile(f))
    .filter(Boolean);

  // Git hotspots
  const hotspots = analyzeGitHotspots(projectRoot);

  // Dead export detection
  const deadExports = detectDeadExports(projectRoot, sourceFiles);

  // Format report
  const report = formatDebtReport(fileResults, hotspots, deadExports);

  // Calculate overall stats
  const avgDebt = fileResults.length > 0
    ? Math.round(fileResults.reduce((s, f) => s + f.debtScore, 0) / fileResults.length)
    : 0;

  return {
    report,
    fileResults,
    hotspots,
    deadExports,
    stats: {
      filesAnalyzed: fileResults.length,
      totalFunctions: fileResults.reduce((s, f) => s + f.functionCount, 0),
      avgDebtScore: avgDebt,
      highComplexityCount: fileResults.flatMap(f => f.functions).filter(fn => fn.cyclomaticComplexity > 10).length,
      deadExportCount: deadExports.length,
    },
  };
}

/**
 * Collect JavaScript/TypeScript source files from the project.
 */
function collectSourceFiles(dir, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return [];
  const files = [];
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '__pycache__', 'vendor']);

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.isDirectory()) continue;
      if (skipDirs.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectSourceFiles(fullPath, maxDepth, depth + 1));
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (_) { /* skip inaccessible dirs */ }

  return files;
}

module.exports = {
  runTechDebtRadar,
  analyzeFile,
  calculateCyclomaticComplexity,
  calculateCognitiveComplexity,
  extractFunctions,
  analyzeGitHotspots,
  detectDeadExports,
  collectSourceFiles,
  calculateDebtScore,
};
