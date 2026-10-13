'use strict';

const assert = require('assert');
const path = require('path');
const { planIntent, executeIntent } = require('../lib/intent_router');

console.log('🧪 Running Natural-Language Intent Router Tests...');

// 1. Plan parsing for security and test
{
  const plan = planIntent('check my auth tokens, scan security, and make sure tests pass');
  assert(plan.some(t => t.id === 'audit'), 'Plan should include audit');
  assert(plan.some(t => t.id === 'verify'), 'Plan should include verify');
  console.log('  ✔ planIntent correctly identifies audit and verify tasks');
}

// 2. Plan parsing for pulse and tech debt
{
  const plan = planIntent('show project pulse health and analyze tech debt complexity');
  assert(plan.some(t => t.id === 'pulse'), 'Plan should include pulse');
  assert(plan.some(t => t.id === 'debt'), 'Plan should include debt');
  console.log('  ✔ planIntent correctly identifies pulse and debt tasks');
}

// 3. Plan parsing for scaffold
{
  const plan = planIntent('scaffold api users for our backend');
  assert(plan.some(t => t.id === 'scaffold'), 'Plan should include scaffold');
  const scaffoldTask = plan.find(t => t.id === 'scaffold');
  assert.strictEqual(scaffoldTask.params.type, 'api');
  assert.strictEqual(scaffoldTask.params.name, 'users');
  console.log('  ✔ planIntent extracts scaffold arguments from natural language');
}

// 4. Fallback execution
{
  const plan = planIntent('random gibberish string with no commands');
  assert(plan.length >= 1, 'Fallback plan should provide default tasks');
  console.log('  ✔ planIntent fallback behavior verified');
}

console.log('✨ All Intent Router Tests Passed Deterministically!\n');
