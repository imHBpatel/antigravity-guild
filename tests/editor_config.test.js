'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { configureMcpInFile, getEditorConfigPaths } = require('../lib/editor_config');

console.log('🧪 Running 1-Click Editor MCP Config Tests...');

// 1. Configure MCP in non-existing file
{
  const tmpFile = path.join(os.tmpdir(), `test-claude-config-${Date.now()}.json`);
  const res = configureMcpInFile(tmpFile, false);

  assert(res.updated, 'Must update config');
  assert(fs.existsSync(tmpFile), 'Must create config file');

  const content = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  assert(content.mcpServers.openguild, 'Must inject openguild server');
  assert.strictEqual(content.mcpServers.openguild.command, 'npx');

  fs.unlinkSync(tmpFile);
  console.log('  ✔ Fresh editor config creation passed');
}

// 2. Non-destructive merge with existing tools
{
  const tmpFile = path.join(os.tmpdir(), `test-existing-config-${Date.now()}.json`);
  const existingConfig = {
    mcpServers: {
      other_tool: { command: 'node', args: ['server.js'] }
    }
  };
  fs.writeFileSync(tmpFile, JSON.stringify(existingConfig), 'utf8');

  const res = configureMcpInFile(tmpFile, false);
  assert(res.updated);

  const updatedContent = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  assert(updatedContent.mcpServers.other_tool, 'Must preserve other tools');
  assert(updatedContent.mcpServers.openguild, 'Must add openguild');

  fs.unlinkSync(tmpFile);
  console.log('  ✔ Non-destructive config merging passed');
}

// 3. getEditorConfigPaths returns valid paths
{
  const paths = getEditorConfigPaths('/fake/project');
  assert(paths.claude, 'Must resolve claude path');
  assert(paths.cursor.includes('.cursor'), 'Must resolve cursor workspace path');
  assert(paths.antigravity.includes('.gemini'), 'Must resolve antigravity workspace path');
  console.log('  ✔ Editor path resolution passed');
}

console.log('✨ All Editor MCP Config Tests Passed!\n');
