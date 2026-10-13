'use strict';

const assert = require('assert');
const path = require('path');
const { decomposeGoal, runAutonomousAgent, formatAgentReport } = require('../lib/agent_loop');

console.log('🧪 Running Autonomous Agent Loop Tests...');

// 1. Goal Decomposition Verification
{
  const milestones = decomposeGoal('Implement OAuth2 PKCE login flow');
  assert.strictEqual(milestones.length, 5, 'Should decompose goal into 5 sequential milestones');
  assert.ok(milestones[0].role.includes('Architect'), 'First milestone should be led by Chief Architect');
  assert.ok(milestones[1].role.includes('Security'), 'Second milestone should be led by Security Officer');
  assert.ok(milestones[3].role.includes('QA'), 'Fourth milestone should be led by QA Lead');
  console.log('  ✔ Goal decomposition and Council role assignment verified');
}

// 2. Autonomous Agent Execution (Dry-Run)
{
  const cwd = path.resolve(__dirname, '..');
  const result = runAutonomousAgent('Refactor token verification logic', { cwd, dryRun: true });

  assert.strictEqual(result.success, true, 'Dry-run execution should succeed');
  assert.strictEqual(result.steps.length, 5, 'Should have executed 5 milestones');
  assert.strictEqual(result.steps[0].status, 'COMPLETED', 'Milestone 1 should be completed');
  assert.ok(result.steps[2].outcome.includes('[DRY-RUN]'), 'Step 3 outcome should reflect dry-run mode');
  assert.ok(result.markdown.includes('OmniGuild Autonomous Agent Loop'), 'Markdown report should be formatted');
  assert.ok(result.markdown.includes('Council Verification Sign-Offs'), 'Council sign-offs table should exist');
  console.log('  ✔ Autonomous agent execution (dry-run) verified');
}

// 3. Format Agent Report
{
  const mockResult = {
    goal: 'Test Mock Goal',
    success: true,
    durationMs: 420,
    steps: [
      { id: 1, role: 'Chief Architect', title: 'Plan', description: 'Make plan', status: 'COMPLETED', outcome: 'Done' }
    ],
    filesInspected: ['lib/auth.js'],
    healed: true,
    lessonsRecorded: ['Always test mock']
  };

  const md = formatAgentReport(mockResult);
  assert.ok(md.includes('SUCCESS'), 'Report should show SUCCESS');
  assert.ok(md.includes('Self-Healing Invoked'), 'Report should note self-healing');
  assert.ok(md.includes('lib/auth.js'), 'Report should list inspected files');
  assert.ok(md.includes('Always test mock'), 'Report should list lessons recorded');
  console.log('  ✔ Agent report formatting verified');
}

console.log('✨ All Autonomous Agent Loop Tests Passed!\n');
