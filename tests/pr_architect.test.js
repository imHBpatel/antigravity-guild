const assert = require('assert');
const path = require('path');
const { getGitDiff, generateCommitMessage, generatePrBlueprint } = require('../lib/pr_architect');

console.log('🧪 Running Council PR & Commit Architect Tests...');

// 1. generateCommitMessage tests
{
  const msg1 = generateCommitMessage(['tests/app.test.js'], '', 'add tests');
  assert(msg1.startsWith('test(tests): add tests'), `Expected test(tests), got: ${msg1}`);
  assert(msg1.includes('16-Mind Supreme Council'));

  const msg2 = generateCommitMessage(['README.md'], '');
  assert(msg2.startsWith('docs(docs): update README.md'), `Expected docs(docs), got: ${msg2}`);

  const msg3 = generateCommitMessage(['package.json'], '');
  assert(msg3.startsWith('chore(config): update package.json'), `Expected chore(config), got: ${msg3}`);

  const msg4 = generateCommitMessage(['lib/core.js'], '', 'fixed null pointer');
  assert(msg4.startsWith('fix(core): fixed null pointer'), `Expected fix(core), got: ${msg4}`);

  console.log('  ✔ generateCommitMessage classification verified');
}

// 2. generatePrBlueprint tests
{
  const mockDiff = `diff --git a/lib/auth.js b/lib/auth.js
index 1234567..89abcdef 100644
--- a/lib/auth.js
+++ b/lib/auth.js
@@ -10,3 +10,4 @@
+function verifyToken(token) { return jwt.verify(token, secret); }
`;
  const blueprint = generatePrBlueprint({ diff: mockDiff, title: 'feat: add verifyToken helper' });

  assert.strictEqual(blueprint.title, 'feat: add verifyToken helper');
  assert(blueprint.markdown.includes('Council PR Architect'));
  assert(blueprint.markdown.includes('Multi-Role Council Sign-Offs'));
  assert(blueprint.markdown.includes('Deterministic Invariants Proof'));
  assert(blueprint.markdown.includes('Suggested Conventional Commit'));
  assert(['APPROVED', 'APPROVED_WITH_COMMENTS', 'NEEDS_REVISION'].includes(blueprint.verdict));

  console.log('  ✔ generatePrBlueprint markdown synthesis and Council sign-offs verified');
}

// 3. getGitDiff sanity test
{
  const diffData = getGitDiff(process.cwd());
  assert(typeof diffData === 'object');
  assert(typeof diffData.diff === 'string');
  assert(Array.isArray(diffData.changedFiles));

  console.log('  ✔ getGitDiff workspace inspection verified');
}

console.log('✨ All Council PR Architect Tests Passed!\n');
