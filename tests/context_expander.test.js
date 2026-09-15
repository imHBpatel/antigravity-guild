const assert = require('assert');
const { extractDirectives, expandContext } = require('../lib/context_expander');

console.log('🧪 Running Smart @ Context Expander Tests...');

// 1. extractDirectives test
{
  const input = 'Review @symbol:detectStack and check @file:lib/constants.js#L1-L15 with @memory:security and @git';
  const dirs = extractDirectives(input);

  assert.strictEqual(dirs.length, 4);
  assert.strictEqual(dirs[0].type, 'symbol');
  assert.strictEqual(dirs[0].target, 'detectStack');
  assert.strictEqual(dirs[1].type, 'file');
  assert.strictEqual(dirs[1].target, 'lib/constants.js#L1-L15');
  assert.strictEqual(dirs[2].type, 'memory');
  assert.strictEqual(dirs[2].target, 'security');
  assert.strictEqual(dirs[3].type, 'git');

  console.log('  ✔ extractDirectives parses all supported @ directives');
}

// 2. expandContext test
{
  const input = '@symbol:detectStack @file:lib/constants.js#L1-L10 @memory:security @git';
  const result = expandContext(input, { cwd: process.cwd() });

  assert(result.expandedMarkdown.includes('OmniGuild Expanded Context'));
  assert(result.expandedMarkdown.includes('Symbol: `detectStack`'));
  assert(result.expandedMarkdown.includes('File: `lib/constants.js`'));
  assert(result.expandedMarkdown.includes('Memory Rules: "security"'));
  assert(result.expandedMarkdown.includes('Git State'));
  assert.strictEqual(result.resolvedDirectives.length, 4);
  assert(result.estimatedTokens > 0);

  console.log('  ✔ expandContext resolves directives into token-budgeted prompt markdown');
}

console.log('✨ All Smart @ Context Expander Tests Passed!\n');
