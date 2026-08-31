'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { GLOBAL_DIR_NAME, DEFAULT_MEMORY_FILES, COUNCIL_MEMBERS, c, TOOL_NAME, VERSION } = require('./constants');

/**
 * Get the absolute path to the global memory directory.
 */
function getGlobalMemoryPath() {
  const homeDir = os.homedir();
  return path.join(homeDir, GLOBAL_DIR_NAME, 'memory');
}

/**
 * Initialize or verify the global memory hub.
 * Enforces POSIX 0700 permission hardening on Linux/macOS.
 *
 * @param {boolean} shouldReset - If true, wipes and re-initializes memory.
 * @returns {object} { path: string, created: boolean }
 */
function initMemoryHub(shouldReset = false) {
  const memDir = getGlobalMemoryPath();

  if (shouldReset && fs.existsSync(memDir)) {
    fs.rmSync(memDir, { recursive: true, force: true });
    console.log(`${c.yellow}🔄 [Reset] Cleared global memory hub.${c.reset}`);
  }

  const alreadyExists = fs.existsSync(memDir);

  if (!alreadyExists) {
    fs.mkdirSync(memDir, { recursive: true });

    // Hardened file permissions (0700) on POSIX
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(memDir, 0o700);
      } catch { /* ignore on unsupported filesystems */ }
    }

    for (const [filename, content] of Object.entries(DEFAULT_MEMORY_FILES)) {
      const filePath = path.join(memDir, filename);
      fs.writeFileSync(filePath, content, 'utf8');
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(filePath, 0o600);
        } catch { /* non-critical */ }
      }
    }

    console.log(`${c.green}✨ [Created]${c.reset} Global Memory Hub at: ${c.dim}${memDir}${c.reset}`);
    return { path: memDir, created: true };
  } else {
    console.log(`${c.cyan}🧠 [Connected]${c.reset} Global Memory Hub at: ${c.dim}${memDir}${c.reset}`);
    return { path: memDir, created: false };
  }
}

/**
 * Display the interactive status dashboard of the global memory hub.
 */
function printStatusDashboard() {
  const memDir = getGlobalMemoryPath();
  const exists = fs.existsSync(memDir);

  console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════╗
║              📊 OPENGUILD GLOBAL MEMORY DASHBOARD            ║
║     Engine v${VERSION.padEnd(6)} • ${exists ? 'STATUS: ACTIVE 🟢' : 'STATUS: NOT INITIALIZED ⚪'} • Cross-Project Hub ║
╚══════════════════════════════════════════════════════════════╝${c.reset}
`);

  console.log(`${c.bold}Global Hub Path:${c.reset} ${c.dim}${memDir}${c.reset}\n`);

  if (!exists) {
    console.log(`${c.yellow}Global memory hub has not been initialized yet.${c.reset}`);
    console.log(`Run ${c.bold}npx antigravity-guild${c.reset} to initialize it.`);
    return;
  }

  console.log(`${c.bold}${c.green}Active Memory Vault Documents:${c.reset}`);
  try {
    const files = fs.readdirSync(memDir);
    for (const file of files) {
      const fullPath = path.join(memDir, file);
      const stat = fs.statSync(fullPath);
      const sizeKb = (stat.size / 1024).toFixed(1);
      const mtime = stat.mtime.toISOString().replace('T', ' ').substring(0, 19);
      console.log(`  📄 ${c.bold}${file.padEnd(26)}${c.reset} ${c.dim}(${sizeKb} KB, updated: ${mtime})${c.reset}`);
    }
  } catch (err) {
    console.error(`  ${c.red}Failed to read memory directory: ${err.message}${c.reset}`);
  }

  console.log(`\n${c.bold}${c.magenta}The 9-Expert Council Registry (Active):${c.reset}`);
  for (const member of COUNCIL_MEMBERS) {
    console.log(`  ${member.icon}  ${c.bold}${member.title.padEnd(28)}${c.reset} ${c.dim}— ${member.domain}${c.reset}`);
  }

  console.log(`\n${c.cyan}Persistent Across:${c.reset} Antigravity IDE, Gemini, Cursor IDE, Claude, OpenAI Code Agents.`);
}

module.exports = {
  getGlobalMemoryPath,
  initMemoryHub,
  printStatusDashboard,
};
