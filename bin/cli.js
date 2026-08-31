#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { VERSION, TOOL_NAME, PRESETS, c, getBanner, getHelpText } = require('../lib/constants');
const { detectStack } = require('../lib/detectors');
const { initMemoryHub, printStatusDashboard, getGlobalMemoryPath } = require('../lib/memory');
const { synthesizeContracts } = require('../lib/generator');
const { enforceGitignore } = require('../lib/gitignore');
const { startMcpServer } = require('../lib/mcp');
const { runInteractiveWizard } = require('../lib/wizard');
const { installPreCommitHook } = require('../lib/hooks');
const { exportMemory, importMemory } = require('../lib/sync');
const { setupEditorMcp } = require('../lib/editor_config');
const { lintAllMemory } = require('../lib/memory_linter');
const { initTeamMemory } = require('../lib/team_memory');

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

// 1. MCP Server Subcommand (Zero-overhead stdio)
if (args[0] === 'mcp') {
  startMcpServer();
  return;
}

// 2. 1-Click Editor MCP Auto-Configurator
if (args.includes('--setup-mcp')) {
  const targetIdx = args.indexOf('--setup-mcp') + 1;
  const targetEditor = args[targetIdx] && !args[targetIdx].startsWith('-') ? args[targetIdx] : 'all';
  setupEditorMcp(targetEditor, process.cwd(), args.includes('--dry-run'));
  process.exit(0);
}

// 3. Workspace Team Memory Initialization
if (args.includes('--team')) {
  initTeamMemory(process.cwd());
  process.exit(0);
}

// 4. Memory Vault Linter & Deduplicator
if (args.includes('--lint-memory') || args[0] === 'lint-memory') {
  lintAllMemory(process.cwd(), args.includes('--fix'));
  process.exit(0);
}

// 5. Informational & Interactive Flags
if (args.includes('--help') || args.includes('-h')) {
  console.log(getHelpText());
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(`${TOOL_NAME} v${VERSION}`);
  process.exit(0);
}

if (args.includes('--status') || args.includes('-s')) {
  printStatusDashboard();
  process.exit(0);
}

if (args.includes('--interactive') || args.includes('-i')) {
  runInteractiveWizard();
  return;
}

if (args.includes('--install-hooks')) {
  installPreCommitHook(process.cwd());
  process.exit(0);
}

if (args.includes('--export-memory')) {
  const targetIdx = args.indexOf('--export-memory') + 1;
  const targetFile = args[targetIdx] && !args[targetIdx].startsWith('-') ? args[targetIdx] : null;
  exportMemory(targetFile);
  process.exit(0);
}

if (args.includes('--import-memory')) {
  const sourceIdx = args.indexOf('--import-memory') + 1;
  const sourceFile = args[sourceIdx];
  if (!sourceFile) {
    console.error(`${c.red}✖ Missing file path for --import-memory.${c.reset}`);
    console.error('  Usage: npx antigravity-guild --import-memory <backup.json>');
    process.exit(1);
  }
  importMemory(sourceFile);
  process.exit(0);
}

// Preset extraction
let selectedPreset = 'full';
const presetIdx = args.indexOf('--preset') !== -1 ? args.indexOf('--preset') : args.indexOf('-p');
if (presetIdx !== -1 && args[presetIdx + 1] && !args[presetIdx + 1].startsWith('-')) {
  const reqPreset = args[presetIdx + 1].toLowerCase();
  if (PRESETS[reqPreset]) {
    selectedPreset = reqPreset;
  } else {
    console.warn(`${c.yellow}⚠ Unknown preset "${reqPreset}". Defaulting to "full".${c.reset}`);
  }
}

const shouldReset = args.includes('--reset');
const isDryRun = args.includes('--dry-run') || args.includes('-d');

// ---------------------------------------------------------------------------
// Standard Execution Banner
// ---------------------------------------------------------------------------
console.log(getBanner());

if (isDryRun) {
  console.log(`${c.yellow}${c.bold}🧪 [DRY RUN MODE]${c.reset} Previewing actions without modifying filesystem.\n`);
}

// ---------------------------------------------------------------------------
// Working Directory Verification
// ---------------------------------------------------------------------------
const cwd = process.cwd();
const projectName = path.basename(cwd);

try {
  fs.accessSync(cwd, fs.constants.W_OK);
} catch {
  console.error(`${c.red}✖ Error: No write permission in ${cwd}${c.reset}`);
  console.error('  Run this command from a directory you own.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Global Persistent Memory Hub & Team Memory Check
// ---------------------------------------------------------------------------
const memHub = isDryRun
  ? { path: getGlobalMemoryPath(), created: false }
  : initMemoryHub(shouldReset);

const teamMemDir = path.join(cwd, '.openguild');
if (fs.existsSync(teamMemDir)) {
  console.log(`${c.cyan}👥 [Connected]${c.reset} Workspace Team Memory at: ${c.dim}${teamMemDir}${c.reset}`);
}

// ---------------------------------------------------------------------------
// 2. Universal Stack Detection
// ---------------------------------------------------------------------------
let files = [];
try {
  files = fs.readdirSync(cwd);
} catch {
  files = [];
}

const stack = detectStack(files, cwd);

const monorepoStr = stack.isMonorepo ? ` [${c.yellow}${stack.monorepoTool}${c.reset}]` : '';
console.log(
  `${c.magenta}🔍 [Detected]${c.reset} ${c.bold}${stack.lang}${c.reset}` +
  ` (${stack.framework}) using ${c.bold}${stack.pkgManager}${c.reset}${monorepoStr}` +
  ` | Preset: ${c.bold}${PRESETS[selectedPreset].name}${c.reset}`
);

// ---------------------------------------------------------------------------
// 3. AI Agent Rule Synthesis
// ---------------------------------------------------------------------------
const contracts = synthesizeContracts(cwd, projectName, memHub.path, stack, selectedPreset, isDryRun);

console.log(`${c.green}✅ [Synthesized]${c.reset}`);
for (const item of contracts) {
  console.log(`  • ${item.label}`);
}

// ---------------------------------------------------------------------------
// 4. Context Hygiene (.gitignore)
// ---------------------------------------------------------------------------
const gitignoreRes = enforceGitignore(cwd, isDryRun);
if (gitignoreRes.created) {
  console.log(`${c.green}✅ [Generated]${c.reset} .gitignore with context hygiene rules.`);
} else if (gitignoreRes.updated) {
  console.log(`${c.green}✅ [Updated]${c.reset} .gitignore with ${gitignoreRes.addedCount} missing exclusions.`);
} else {
  console.log(`${c.dim}🛡️  [Verified]${c.reset} .gitignore context hygiene already up to date.`);
}

// ---------------------------------------------------------------------------
// Completion Summary & Prompt Playbook
// ---------------------------------------------------------------------------
console.log(`
${c.green}${c.bold}🎉 [Success]${c.reset} Project "${c.bold}${projectName}${c.reset}" configured with ${PRESETS[selectedPreset].name}!

${c.cyan}${c.bold}💡 Quick Prompts to try in your AI editor (Antigravity, Cursor, Claude):${c.reset}
  ${c.yellow}1.${c.reset} "Design the architecture and data model before writing code."
  ${c.yellow}2.${c.reset} "Review this interface for Apple-grade UI polish and responsiveness."
  ${c.yellow}3.${c.reset} "Audit this feature for security vulnerabilities and secret leaks."
  ${c.yellow}4.${c.reset} "Run our test suite and verify all invariants pass."

${c.dim}Open your editor and start prompting with persistent memory.${c.reset}
`);