'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { c } = require('./constants');

/**
 * Get standard config file paths for supported AI editors.
 */
function getEditorConfigPaths(projectDir = process.cwd()) {
  const homeDir = os.homedir();
  const platform = process.platform;

  let claudePath;
  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    claudePath = path.join(appData, 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'darwin') {
    claudePath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    claudePath = path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
  }

  const cursorWorkspacePath = path.join(projectDir, '.cursor', 'mcp.json');
  const antigravityWorkspacePath = path.join(projectDir, '.gemini', 'mcp_config.json');

  return {
    claude: claudePath,
    cursor: cursorWorkspacePath,
    antigravity: antigravityWorkspacePath,
  };
}

/**
 * Inject OpenGuild MCP server definition into an editor's JSON config file non-destructively.
 *
 * @param {string} configPath - Path to the target JSON configuration.
 * @param {boolean} dryRun - If true, returns changes without writing.
 * @returns {object} { path: string, updated: boolean, error?: string }
 */
function configureMcpInFile(configPath, dryRun = false) {
  const openguildServerEntry = {
    command: 'npx',
    args: ['-y', 'antigravity-guild', 'mcp'],
  };

  let config = { mcpServers: {} };

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(raw);
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        config.mcpServers = {};
      }
    } catch (err) {
      return { path: configPath, updated: false, error: `Invalid JSON: ${err.message}` };
    }
  }

  config.mcpServers.openguild = openguildServerEntry;

  if (!dryRun) {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  return { path: configPath, updated: true };
}

/**
 * 1-Click MCP Setup for specified or all editors.
 *
 * @param {string} target - 'claude', 'cursor', 'antigravity', or 'all'.
 * @param {string} projectDir - Workspace directory.
 * @param {boolean} dryRun - If true, previews changes.
 */
function setupEditorMcp(target = 'all', projectDir = process.cwd(), dryRun = false) {
  const paths = getEditorConfigPaths(projectDir);
  const results = [];

  console.log(`\n${c.cyan}${c.bold}⚡ OpenGuild 1-Click MCP Configurator${c.reset}`);
  if (dryRun) console.log(`${c.yellow}🧪 [DRY RUN] Previewing editor configurations without writing.${c.reset}`);

  const targets = target === 'all' ? Object.keys(paths) : [target.toLowerCase()];

  for (const t of targets) {
    if (!paths[t]) {
      console.warn(`${c.yellow}⚠ Unsupported editor "${t}". Choose from: claude, cursor, antigravity, all.${c.reset}`);
      continue;
    }

    const res = configureMcpInFile(paths[t], dryRun);
    results.push({ editor: t, ...res });

    if (res.updated) {
      console.log(`  ${c.green}✔ [Configured]${c.reset} ${c.bold}${t.toUpperCase()}${c.reset} MCP server at: ${c.dim}${res.path}${c.reset}`);
    } else {
      console.log(`  ${c.red}✖ [Failed]${c.reset} ${c.bold}${t.toUpperCase()}${c.reset}: ${res.error}`);
    }
  }

  console.log(`\n${c.green}${c.bold}🎉 MCP Server is connected!${c.reset}`);
  console.log(`${c.dim}Your AI assistants can now query and update OpenGuild memory in real time.${c.reset}\n`);

  return results;
}

module.exports = {
  getEditorConfigPaths,
  configureMcpInFile,
  setupEditorMcp,
};
