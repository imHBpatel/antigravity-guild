'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { MCP_TOOLS, handleToolCall } = require('../lib/mcp');

console.log('🧪 Running Model Context Protocol (MCP) Server Tests...');

// 1. Tool Schemas
{
  assert(Array.isArray(MCP_TOOLS), 'MCP_TOOLS must be an array');
  assert.strictEqual(MCP_TOOLS.length, 10, 'Must expose 10 MCP tools');

  const names = MCP_TOOLS.map(t => t.name);
  assert(names.includes('openguild_read_memory'));
  assert(names.includes('openguild_write_memory'));
  assert(names.includes('openguild_learn'));
  assert(names.includes('openguild_search_memory'));
  assert(names.includes('openguild_consult_council'));
  assert(names.includes('openguild_get_project_context'));
  assert(names.includes('openguild_auto_analyze'));
  assert(names.includes('openguild_profile_tokens'));
  assert(names.includes('openguild_verify_invariants'));
  assert(names.includes('openguild_audit_security'));

  console.log('  ✔ MCP Tool Schemas registered correctly');
}

// 2. Tool Invocations: openguild_read_memory
{
  const resAll = handleToolCall('openguild_read_memory', {});
  assert(!resAll.isError, 'Read memory must not error');
  assert(resAll.content[0].text.includes('Global Memory Vault'), 'Must contain vault title');

  const resSingle = handleToolCall('openguild_read_memory', { file: 'security_standards.md' });
  assert(!resSingle.isError);
  assert(/zero secret leakage/i.test(resSingle.content[0].text));

  console.log('  ✔ openguild_read_memory tool verified');
}

// 3. Tool Invocations: openguild_write_memory, openguild_learn, & search_memory
{
  const testKey = `test_token_${Date.now()}`;
  const writeRes = handleToolCall('openguild_write_memory', {
    file: 'institutional_memory.md',
    content: `Always validate ${testKey} before network dispatch.`
  });
  assert(!writeRes.isError);

  const searchRes = handleToolCall('openguild_search_memory', { query: testKey });
  assert(!searchRes.isError);
  assert(searchRes.content[0].text.includes(testKey), 'Search must find newly written memory');

  // Test openguild_learn with secret scrubbing
  const learnKey = `AKIAIOSFODNN7${Date.now().toString().slice(-7)}`;
  const learnRes = handleToolCall('openguild_learn', {
    insight: `Never commit AWS key ${learnKey} to public repos.`,
    category: 'security',
    tags: ['aws', 'secrets']
  });
  assert(!learnRes.isError);
  assert(learnRes.content[0].text.includes('[REDACTED_SECRET]'), 'Must scrub secret');
  assert(learnRes.content[0].text.includes(learnKey) === false);

  console.log('  ✔ openguild_write_memory, openguild_learn & search_memory verified');
}

// 4. Tool Invocations: openguild_consult_council (Consensus & Debate modes)
{
  const councilRes = handleToolCall('openguild_consult_council', {
    prompt: 'Should we migrate from REST to GraphQL for our mobile client?',
    mode: 'debate',
    roles: ['architect', 'google_cto', 'apple_cto']
  });
  assert(!councilRes.isError);
  assert(councilRes.content[0].text.includes('Chief Software Architect'));
  assert(councilRes.content[0].text.includes('Google CTO Brain'));
  assert(councilRes.content[0].text.includes('Apple CTO Brain'));
  assert(councilRes.content[0].text.includes('Dialectical Tension & Trade-Off Analysis'));

  console.log('  ✔ openguild_consult_council verified');
}

// 5. Tool Invocations: openguild_get_project_context
{
  const contextRes = handleToolCall('openguild_get_project_context', { projectPath: __dirname + '/..' });
  assert(!contextRes.isError);
  assert(contextRes.content[0].text.includes('Workspace Context'));
  assert(contextRes.content[0].text.includes('Deterministic Verification Invariants'));

  console.log('  ✔ openguild_get_project_context verified');
}

// 6. Tool Invocations: openguild_auto_analyze
{
  const analyzeRes = handleToolCall('openguild_auto_analyze', { vision: 'Build an autonomous AGI agent swarming system' });
  assert(!analyzeRes.isError);
  assert(analyzeRes.content[0].text.includes('OpenGuild Supreme Auto-Analyst Blueprint'));
  assert(analyzeRes.content[0].text.includes('AUTONOMOUS_AI'));

  console.log('  ✔ openguild_auto_analyze verified');
}

// 7. Tool Invocations: openguild_profile_tokens
{
  const tokenRes = handleToolCall('openguild_profile_tokens', { projectPath: __dirname + '/..' });
  assert(!tokenRes.isError);
  assert(tokenRes.content[0].text.includes('Token & Context Diet Report'));

  console.log('  ✔ openguild_profile_tokens verified');
}

// 8. Tool Invocations: openguild_verify_invariants
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-mcp-veri-'));
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'mcp-verify-sample', scripts: { test: 'node -e "process.exit(0)"' } })
  );

  const verifyRes = handleToolCall('openguild_verify_invariants', { projectPath: tmpDir });
  assert(typeof verifyRes.content[0].text === 'string');
  assert(verifyRes.content[0].text.includes('Deterministic Verification Proof'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ openguild_verify_invariants verified');
}

// 9. Tool Invocations: openguild_audit_security
{
  const auditRes = handleToolCall('openguild_audit_security', { projectPath: __dirname + '/..' });
  assert(!auditRes.isError);
  assert(auditRes.content[0].text.includes('SAIF 2.0 Security Audit'));

  console.log('  ✔ openguild_audit_security verified');
}

console.log('✨ All MCP Server Tests Passed!\n');
