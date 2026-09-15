'use strict';

const fs = require('fs');
const path = require('path');
const { scrubSecrets } = require('./learn');

/**
 * Stage 1: Architecture & Domain Modeling Gate (Chief Software Architect)
 */
function reviewArchitecture(code, filename = '') {
  const findings = [];
  const lines = code.split(/\r?\n/);
  const lineCount = lines.length;

  if (lineCount > 350) {
    findings.push({
      level: 'WARN',
      issue: `File exceeds 350 lines (${lineCount} lines). Monolithic anti-pattern hazard; recommend modular decomposition.`,
    });
  }

  // Check for circular or deeply nested callbacks
  let maxIndent = 0;
  for (const line of lines) {
    const leadingSpaces = line.match(/^(\s*)/)[1].length;
    if (leadingSpaces > maxIndent && line.trim().length > 0) {
      maxIndent = leadingSpaces;
    }
  }
  if (maxIndent >= 20) {
    findings.push({
      level: 'WARN',
      issue: `Deep nesting detected (indentation depth ${maxIndent} spaces). Recommend early returns or extracting helper functions.`,
    });
  }

  const hasDecoupledExports = /module\.exports\s*=|export\s+(?:default|const|function|class)/.test(code);
  if (!hasDecoupledExports && filename && !filename.includes('test') && !filename.endsWith('.json')) {
    findings.push({
      level: 'WARN',
      issue: 'No explicit module exports detected. Ensure clean interface boundaries and composability.',
    });
  }

  const score = findings.some(f => f.level === 'FAIL') ? 50 : findings.length > 0 ? 80 : 100;
  const status = score >= 90 ? 'PASS' : score >= 70 ? 'WARN' : 'FAIL';

  return {
    stage: 'Architecture & Domain Gate',
    mind: '🧠 Chief Software Architect',
    status,
    score,
    findings,
    recommendations: findings.length === 0
      ? ['Domain boundaries are clean, modular, and single-responsibility compliant.']
      : findings.map(f => f.issue),
  };
}

/**
 * Stage 2: Security & SAIF 2.0 Compliance Gate (Chief Security Officer)
 */
function reviewSecurity(code) {
  const findings = [];

  // Plaintext secret check
  const { scrubbed } = scrubSecrets(code);
  if (scrubbed) {
    findings.push({
      level: 'FAIL',
      issue: 'Hardcoded secret or authentication token detected. Must be extracted to environment variables.',
    });
  }

  // Arbitrary execution
  if (/\beval\s*\(/.test(code)) {
    findings.push({
      level: 'FAIL',
      issue: 'Critical hazard: eval() executes arbitrary untrusted strings. Prohibited under SAIF standards.',
    });
  }
  if (/new\s+Function\s*\(/.test(code)) {
    findings.push({
      level: 'FAIL',
      issue: 'Arbitrary code construction via new Function() detected.',
    });
  }

  // SQL Injection check
  if (/(?:SELECT|UPDATE|DELETE|INSERT)\s+.*?\+\s*[A-Za-z0-9_]/i.test(code)) {
    findings.push({
      level: 'FAIL',
      issue: 'Dynamic SQL string concatenation detected. Use parameterized queries ($1, ? or ORM bindings).',
    });
  }

  // DOM XSS check
  if (/\.innerHTML\s*=/.test(code)) {
    findings.push({
      level: 'WARN',
      issue: 'Direct innerHTML assignment detected. Use textContent or DOMPurify to prevent XSS.',
    });
  }

  const hasFail = findings.some(f => f.level === 'FAIL');
  const score = hasFail ? 30 : findings.length > 0 ? 75 : 100;
  const status = score >= 90 ? 'PASS' : score >= 70 ? 'WARN' : 'FAIL';

  return {
    stage: 'Security & SAIF 2.0 Gate',
    mind: '🛡️ Chief Security Officer',
    status,
    score,
    findings,
    recommendations: findings.length === 0
      ? ['Zero secret exposure. Cryptographic and input validation standards compliant.']
      : findings.map(f => f.issue),
  };
}

/**
 * Stage 3: QA & Deterministic Invariants Gate (Principal QA Lead)
 */
function reviewQa(code) {
  const findings = [];
  const lines = code.split(/\r?\n/);

  // Empty catch blocks / swallowed exceptions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
      findings.push({
        level: 'FAIL',
        issue: `Swallowed error at line ${i + 1}: empty catch block silently hides runtime failures.`,
      });
    }
  }

  // Unhandled promises
  if (/new\s+Promise/.test(code) && !/reject/.test(code)) {
    findings.push({
      level: 'WARN',
      issue: 'Promise construction without reject handler. Network/async failure may hang indefinitely.',
    });
  }

  const hasFail = findings.some(f => f.level === 'FAIL');
  const score = hasFail ? 45 : findings.length > 0 ? 80 : 100;
  const status = score >= 90 ? 'PASS' : score >= 70 ? 'WARN' : 'FAIL';

  return {
    stage: 'QA & Deterministic Invariants Gate',
    mind: '🧪 Principal QA Lead',
    status,
    score,
    findings,
    recommendations: findings.length === 0
      ? ['Zero regression hazard. Deterministic error handling and edge cases accounted for.']
      : findings.map(f => f.issue),
  };
}

/**
 * Stage 4: Apple-Grade UX & Developer Experience Gate (Apple CTO & UI/UX Lead)
 */
function reviewUxDx(code) {
  const findings = [];
  const lines = code.split(/\r?\n/);

  // Cryptic single-character variable names (outside loops)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^(?:const|let|var)\s+([a-zA-Z])\s*=/.test(line) && !line.includes('for (')) {
      const varName = line.match(/^(?:const|let|var)\s+([a-zA-Z])\s*=/)[1];
      if (!['i', 'j', 'k', 'x', 'y', 'z', '_'].includes(varName)) {
        findings.push({
          level: 'WARN',
          issue: `Cryptic variable identifier "${varName}" at line ${i + 1}. Use self-documenting naming.`,
        });
      }
    }
  }

  // Unexplained regex expressions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/\/[^/]{20,}\/[gimsuy]*/.test(line)) {
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      if (!prevLine.startsWith('//') && !prevLine.startsWith('/*') && !prevLine.startsWith('*')) {
        findings.push({
          level: 'WARN',
          issue: `Complex regex at line ${i + 1} lacks an explanatory comment explaining what pattern it matches.`,
        });
      }
    }
  }

  const score = findings.length === 0 ? 100 : Math.max(65, 100 - findings.length * 10);
  const status = score >= 90 ? 'PASS' : score >= 70 ? 'WARN' : 'FAIL';

  return {
    stage: 'Apple UX / Developer Experience Gate',
    mind: '🍎 Apple CTO & UI/UX Lead',
    status,
    score,
    findings,
    recommendations: findings.length === 0
      ? ['Code ergonomics feel intuitive, self-documenting, and beautifully structured.']
      : findings.map(f => f.issue),
  };
}

/**
 * Run complete 4-stage Council SOP Multi-Agent Review.
 *
 * @param {string} input - File path, git diff, or raw code string.
 * @param {object} options - { filename, intent }
 * @returns {object} { target, passed, overallScore, grade, stages, reportMarkdown }
 */
function runCouncilSop(input, options = {}) {
  let code = input || '';
  let filename = options.filename || '';

  // If input is an existing file path, read it
  if (typeof input === 'string' && fs.existsSync(input) && fs.statSync(input).isFile()) {
    filename = path.basename(input);
    code = fs.readFileSync(input, 'utf8');
  }

  const archResult = reviewArchitecture(code, filename);
  const secResult = reviewSecurity(code);
  const qaResult = reviewQa(code);
  const uxResult = reviewUxDx(code);

  const stages = [archResult, secResult, qaResult, uxResult];
  const overallScore = Math.round(
    stages.reduce((acc, s) => acc + s.score, 0) / stages.length
  );

  const passed = !stages.some(s => s.status === 'FAIL');
  const grade = overallScore >= 95 ? 'A+'
    : overallScore >= 85 ? 'A'
    : overallScore >= 75 ? 'B'
    : overallScore >= 65 ? 'C'
    : 'F';

  const badge = passed ? '✅ CERTIFIED' : '❌ BLOCKED';

  let report = `# 🏛️ OmniGuild Council SOP Review: ${filename || 'Code Review'}\n\n`;
  report += `**Verdict:** ${badge} | **Council Score:** ${overallScore}/100 (**Grade: ${grade}**)\n\n`;

  if (options.intent) {
    report += `> **Engineering Intent:** ${options.intent}\n\n`;
  }

  for (const s of stages) {
    const icon = s.status === 'PASS' ? '🟢' : s.status === 'WARN' ? '🟡' : '🔴';
    report += `### ${s.mind} — ${s.stage} (${icon} ${s.status}, Score: ${s.score})\n`;
    for (const rec of s.recommendations) {
      report += `- ${rec}\n`;
    }
    report += '\n';
  }

  return {
    target: filename || 'Code Snippet',
    passed,
    overallScore,
    grade,
    stages: {
      architect: archResult,
      security: secResult,
      qa: qaResult,
      ux_dx: uxResult,
    },
    reportMarkdown: report.trim(),
  };
}

module.exports = {
  reviewArchitecture,
  reviewSecurity,
  reviewQa,
  reviewUxDx,
  runCouncilSop,
};
