'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { collectFiles, auditFileContent, auditSecurity } = require('../lib/security_auditor');

console.log('🧪 Running Security & SAIF Auditor Tests...');

// 1. collectFiles exclusion test
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-sec-'));
  fs.mkdirSync(path.join(tmpDir, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'node_modules', 'dep.js'), 'console.log("dep");');
  fs.writeFileSync(path.join(tmpDir, 'app.js'), 'console.log("app");');

  const files = collectFiles(tmpDir);
  assert.strictEqual(files.some(f => f.includes('node_modules')), false, 'Must ignore node_modules');
  assert.strictEqual(files.some(f => f.includes('app.js')), true, 'Must include app.js');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ File collection and directory exclusions verified');
}

// 2. Secret and Vulnerability Detection
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-sec-vuln-'));
  const vulnFile = path.join(tmpDir, 'service.js');
  fs.writeFileSync(vulnFile, 'const query = "SELECT * FROM users WHERE id = " + userId;\neval(input);\n', 'utf8');

  const issues = auditFileContent(vulnFile, tmpDir);
  assert(issues.some(i => i.type === 'SQL Injection Vulnerability'), 'Must detect dynamic SQL');
  assert(issues.some(i => i.type === 'Arbitrary Code Execution'), 'Must detect eval() usage');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Vulnerability detection verified');
}

// 3. Full Workspace Audit
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-sec-clean-'));
  fs.writeFileSync(path.join(tmpDir, 'clean.js'), 'console.log("clean safe code");\n');

  const report = auditSecurity(tmpDir);
  assert.strictEqual(report.grade, 'A+');
  assert(report.reportMarkdown.includes('SAIF 2.0 Security Audit'));
  assert(report.reportMarkdown.includes('Zero Security Vulnerabilities Found'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Clean workspace audit and A+ grade verified');
}

console.log('✨ All Security Auditor Tests Passed!\n');
