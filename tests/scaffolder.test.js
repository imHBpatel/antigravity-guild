'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  scaffoldApi,
  scaffoldUi,
  scaffoldTest,
  runScaffold,
  nameConventions,
} = require('../lib/scaffolder');

console.log('🧪 Running Council Code Scaffolder Tests...');

// 1. Name conventions helper
{
  const n = nameConventions('billing-modal');
  assert.strictEqual(n.pascal, 'BillingModal');
  assert.strictEqual(n.camel, 'billingModal');
  assert.strictEqual(n.kebab, 'billing-modal');
  assert.strictEqual(n.snake, 'billing_modal');
  console.log('  ✔ nameConventions formatting verified');
}

// 2. Scaffold API (Dry run & Real disk write)
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-api-'));
  fs.mkdirSync(path.join(tmpDir, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });

  const res = runScaffold(tmpDir, 'api', 'users', { dryRun: false });
  assert.strictEqual(res.type, 'api');
  assert(res.files.length >= 2, 'Should generate API and test files');
  assert(fs.existsSync(res.files[0]), 'API file must exist on disk');
  assert(fs.existsSync(res.files[1]), 'Test file must exist on disk');

  // Verify generated API code is syntactically valid and loads
  const apiModule = require(res.files[0]);
  assert(typeof apiModule.createUsers === 'function', 'Should export createUsers');
  assert(typeof apiModule.getUsers === 'function', 'Should export getUsers');

  const created = apiModule.createUsers({ name: 'Alice' });
  assert.strictEqual(created.statusCode, 201, 'Should create user with 201');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ scaffoldApi file creation and executable validation verified');
}

// 3. Scaffold UI (Dry run & Real disk write)
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-ui-'));
  const res = runScaffold(tmpDir, 'ui', 'BillingModal', { dryRun: false });
  assert.strictEqual(res.type, 'ui');
  assert(res.files.length >= 2, 'Should generate component and preview HTML');
  assert(fs.existsSync(res.files[0]), 'Component file must exist');
  assert(fs.existsSync(res.files[1]), 'Preview HTML must exist');

  const uiModule = require(res.files[0]);
  assert(typeof uiModule.renderBillingModal === 'function', 'Should export renderBillingModal');
  const rendered = uiModule.renderBillingModal({ title: 'Upgrade Plan' });
  assert(rendered.includes('Upgrade Plan'), 'Rendered HTML should include title');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ scaffoldUi component generation & HTML rendering verified');
}

// 4. Scaffold Test
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-test-'));
  const targetFile = path.join(tmpDir, 'calc.js');
  fs.writeFileSync(targetFile, 'function add(a,b){return a+b;} module.exports={add};', 'utf8');

  const res = runScaffold(tmpDir, 'test', targetFile, { dryRun: false });
  assert.strictEqual(res.type, 'test');
  assert(fs.existsSync(res.files[0]), 'Test file must exist');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ scaffoldTest suite generation verified');
}

console.log('✨ All Scaffolder Tests Passed Deterministically!\n');
