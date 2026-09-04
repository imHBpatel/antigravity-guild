'use strict';

const fs = require('fs');
const path = require('path');
const { scrubSecrets } = require('./learn');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.vscode',
  '.idea',
  'vendor',
  'target',
]);

const SCANNED_EXTENSIONS = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.py',
  '.go',
  '.rs',
  '.json',
  '.yaml',
  '.yml',
  '.env',
  '.md',
]);

/**
 * Scan workspace files recursively.
 *
 * @param {string} dir
 * @param {string[]} fileList
 * @param {number} maxFiles
 */
function collectFiles(dir, fileList = [], maxFiles = 500) {
  if (fileList.length >= maxFiles) return fileList;

  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return fileList;
  }

  for (const entry of entries) {
    if (fileList.length >= maxFiles) break;

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        collectFiles(path.join(dir, entry.name), fileList, maxFiles);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SCANNED_EXTENSIONS.has(ext) || entry.name.startsWith('.env')) {
        fileList.push(path.join(dir, entry.name));
      }
    }
  }

  return fileList;
}

/**
 * Audit a single file's content for security risks.
 *
 * @param {string} filePath
 * @param {string} projectDir
 * @returns {object[]} Array of detected security findings.
 */
function auditFileContent(filePath, projectDir) {
  const relPath = path.relative(projectDir, filePath);
  const issues = [];

  // 1. Flag committed environment / key files directly
  const basename = path.basename(filePath);
  if (basename === '.env' || basename === '.env.local' || basename.endsWith('.pem') || basename.endsWith('.key')) {
    issues.push({
      file: relPath,
      line: 1,
      severity: 'HIGH',
      type: 'Sensitive File Committed',
      description: `Sensitive credential file "${basename}" found in project tree. Should be added to .gitignore.`,
    });
  }

  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return issues;
  }

  // Check secrets
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check for hardcoded credentials (using scrubSecrets)
    const { scrubbed } = scrubSecrets(line);
    if (scrubbed && !line.includes('[REDACTED_SECRET]') && !relPath.includes('tests')) {
      issues.push({
        file: relPath,
        line: lineNum,
        severity: 'CRITICAL',
        type: 'Hardcoded Secret / Token',
        description: 'Potential plaintext credential or access key detected in source code.',
      });
    }

    // Check for raw eval
    if (/\beval\s*\(/.test(line) && !relPath.includes('tests') && !relPath.includes('security_auditor')) {
      issues.push({
        file: relPath,
        line: lineNum,
        severity: 'HIGH',
        type: 'Arbitrary Code Execution',
        description: 'Direct use of "eval()" introduces severe remote code execution vulnerability.',
      });
    }

    // Check for insecure SQL string concatenation
    if (/(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\+\s*[A-Za-z0-9_]+/i.test(line) && !relPath.includes('tests') && !relPath.includes('security_auditor')) {
      issues.push({
        file: relPath,
        line: lineNum,
        severity: 'HIGH',
        type: 'SQL Injection Vulnerability',
        description: 'Unparameterized dynamic SQL string concatenation detected. Use parameterized queries.',
      });
    }
  });

  return issues;
}

/**
 * Run comprehensive SAIF 2.0 security audit across project workspace.
 *
 * @param {string} projectDir - Workspace directory.
 * @returns {object} Security audit scorecard and report.
 */
function auditSecurity(projectDir = process.cwd()) {
  const files = collectFiles(projectDir);
  const allIssues = [];

  for (const file of files) {
    const fileIssues = auditFileContent(file, projectDir);
    allIssues.push(...fileIssues);
  }

  // Calculate score and grade
  const criticalCount = allIssues.filter(i => i.severity === 'CRITICAL').length;
  const highCount = allIssues.filter(i => i.severity === 'HIGH').length;

  let grade = 'A+';
  let badge = '🛡️ SAIF Compliant (Hardened)';

  if (criticalCount > 0) {
    grade = 'F';
    badge = '🚨 Critical Vulnerabilities';
  } else if (highCount > 2) {
    grade = 'C';
    badge = '⚠️ Multiple High-Severity Risks';
  } else if (highCount > 0) {
    grade = 'B';
    badge = '🟡 Low-to-Medium Risk';
  }

  let report = `# 🛡️ OpenGuild SAIF 2.0 Security Audit
**Workspace:** \`${projectDir}\`
**Security Grade:** **${grade}** (${badge})
**Audited Files:** ${files.length} | **Issues Found:** ${allIssues.length}

---

## 📊 Security Scorecard Summary
- **Critical Leaks:** **${criticalCount}** (e.g. plaintext keys, private credentials)
- **High-Severity Risks:** **${highCount}** (e.g. unparameterized SQL, raw eval)
- **SAIF Compliance Status:** ${grade === 'A+' ? '✅ 100% Compliant — Zero secret exposure detected' : '❌ Remediation Required'}

---

`;

  if (allIssues.length === 0) {
    report += `### 🎉 Zero Security Vulnerabilities Found
All scanned files adhere to OpenGuild SAIF standards: zero plaintext keys, no arbitrary code execution vectors, and proper context hygiene.
`;
  } else {
    report += `## ⚠️ Findings & Remediation Steps
| Severity | File:Line | Issue Type | Recommendation |
|:---:|:---|:---|:---|
`;
    for (const issue of allIssues) {
      report += `| **${issue.severity}** | \`${issue.file}:${issue.line}\` | ${issue.type} | ${issue.description} |\n`;
    }
  }

  return {
    grade,
    badge,
    totalFiles: files.length,
    issues: allIssues,
    reportMarkdown: report.trim(),
  };
}

module.exports = {
  collectFiles,
  auditFileContent,
  auditSecurity,
};
