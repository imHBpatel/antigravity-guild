'use strict';

const assert = require('assert');
const { MCP_TOOLS, handleToolCall } = require('../lib/mcp');

console.log('🧪 Running Model Context Protocol (MCP) Server Tests...');

// 1. Tool Schemas
{
  assert(Array.isArray(MCP_TOOLS), 'MCP_TOOLS must be an array');
  assert.strictEqual(MCP_TOOLS.length, 5, 'Must expose 5 MCP tools');

  const names = MCP_TOOLS.map(t => t.name);
  assert(names.includes('openguild_read_memory'));
  assert(names.includes('openguild_write_memory'));
  assert(names.includes('openguild_search_memory'));
  assert(names.includes('openguild_consult_council'));
  assert(names.includes('openguild_get_project_context'));

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

// 3. Tool Invocations: openguild_write_memory & search_memory
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

  console.log('  ✔ openguild_write_memory & search_memory verified');
}

// 4. Tool Invocations: openguild_consult_council
{
  const councilRes = handleToolCall('openguild_consult_council', {
    prompt: 'Should we migrate from REST to GraphQL for our mobile client?',
    roles: ['architect', 'google_cto', 'apple_cto']
  });
  assert(!councilRes.isError);
  assert(councilRes.content[0].text.includes('Chief Software Architect'));
  assert(councilRes.content[0].text.includes('Google CTO Brain'));
  assert(councilRes.content[0].text.includes('Apple CTO Brain'));

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

console.log('✨ All MCP Server Tests Passed!\n');
