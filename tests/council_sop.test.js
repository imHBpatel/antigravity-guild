'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  reviewArchitecture,
  reviewSecurity,
  reviewQa,
  reviewUxDx,
  runCouncilSop,
} = require('../lib/council_sop');

console.log('🧪 Running Council SOP Multi-Agent Review Tests...');

// 1. Architecture Gate Review
{
  const cleanCode = `
class UserService {
  getUser(id) {
    return { id };
  }
}
module.exports = { UserService };
`;
  const cleanRes = reviewArchitecture(cleanCode, 'user.js');
  assert.strictEqual(cleanRes.status, 'PASS');
  assert.strictEqual(cleanRes.score, 100);

  // Monolithic code (> 350 lines)
  const bloatedCode = new Array(360).fill('const x = 1;').join('\n');
  const bloatedRes = reviewArchitecture(bloatedCode, 'monolith.js');
  assert.strictEqual(bloatedRes.status, 'WARN');
  assert(bloatedRes.findings.some(f => f.issue.includes('Monolithic')));
  console.log('  ✔ reviewArchitecture gate verified');
}

// 2. Security Gate Review
{
  const cleanCode = 'const query = db.query("SELECT * FROM users WHERE id = $1", [id]);';
  const cleanRes = reviewSecurity(cleanCode);
  assert.strictEqual(cleanRes.status, 'PASS');

  // SQL Injection & eval hazards
  const flawedCode = `
const query = "SELECT * FROM users WHERE id = " + id;
eval("console.log('danger')");
`;
  const flawedRes = reviewSecurity(flawedCode);
  assert.strictEqual(flawedRes.status, 'FAIL');
  assert(flawedRes.findings.some(f => f.issue.includes('SQL')));
  assert(flawedRes.findings.some(f => f.issue.includes('eval')));
  console.log('  ✔ reviewSecurity gate verified');
}

// 3. QA Gate Review
{
  const cleanCode = `
try {
  doAction();
} catch (err) {
  logger.error(err);
}
`;
  const cleanRes = reviewQa(cleanCode);
  assert.strictEqual(cleanRes.status, 'PASS');

  // Empty catch
  const emptyCatch = `
try {
  doAction();
} catch (e) {}
`;
  const flawedRes = reviewQa(emptyCatch);
  assert.strictEqual(flawedRes.status, 'FAIL');
  assert(flawedRes.findings.some(f => f.issue.includes('Swallowed error')));
  console.log('  ✔ reviewQa gate verified');
}

// 4. Apple UX / DX Gate Review
{
  const cleanCode = 'const userIdentifier = "123";';
  const cleanRes = reviewUxDx(cleanCode);
  assert.strictEqual(cleanRes.status, 'PASS');

  const crypticCode = 'const q = "123";';
  const crypticRes = reviewUxDx(crypticCode);
  assert(crypticRes.findings.some(f => f.issue.includes('Cryptic variable')));
  console.log('  ✔ reviewUxDx gate verified');
}

// 5. Full runCouncilSop on disk and raw string
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-sop-'));

  try {
    const testFile = path.join(tmpDir, 'service.js');
    fs.writeFileSync(testFile, `
class PaymentService {
  processPayment(amount) {
    return { status: 'success', amount };
  }
}
module.exports = { PaymentService };
`);

    const result = runCouncilSop(testFile, { intent: 'Process secure payments' });
    assert(result.passed, 'Clean service should pass review');
    assert(result.overallScore >= 90, 'Clean code should score >= 90');
    assert(result.reportMarkdown.includes('OmniGuild Council SOP Review'));
    assert(result.reportMarkdown.includes('Process secure payments'));

    console.log('  ✔ Full runCouncilSop pipeline verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('✨ All Council SOP Multi-Agent Review Tests Passed!\n');
