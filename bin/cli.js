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
const { recordLesson } = require('../lib/learn');
const { generateCiWorkflow } = require('../lib/ci');
const { autoAnalyze } = require('../lib/analyzer');
const { profileTokens } = require('../lib/token_profiler');
const { verifyProject } = require('../lib/verifier');
const { auditSecurity } = require('../lib/security_auditor');

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

// 3. Autonomous Auto-Analyst & Architecture Blueprint Synthesis
if (args.includes('--analyze') || args.includes('-a') || args[0] === 'analyze') {
  const analyzeIdx = args.indexOf('--analyze') !== -1
    ? args.indexOf('--analyze') + 1
    : args.indexOf('-a') !== -1
      ? args.indexOf('-a') + 1
      : 1;
  const visionArg = args[analyzeIdx] && !args[analyzeIdx].startsWith('-') ? args[analyzeIdx] : null;

  console.log(autoAnalyze(visionArg, { projectDir: process.cwd() }));
  process.exit(0);
}

// 4. Token Profiler & Context Diet Optimizer
if (args.includes('--tokens') || args.includes('--optimize-context')) {
  const result = profileTokens(process.cwd());
  console.log(result.reportMarkdown);
  process.exit(0);
}

// 5. Unified Deterministic Invariant Verifier
if (args.includes('--verify')) {
  const autoFix = args.includes('--fix');
  const result = verifyProject(process.cwd(), { autoFix });
  console.log(result.reportMarkdown);
  process.exit(result.passed ? 0 : 1);
}

// 6. Deep Security & SAIF Codebase Auditor
if (args.includes('--audit') || args[0] === 'audit') {
  const result = auditSecurity(process.cwd());
  console.log(result.reportMarkdown);
  process.exit(result.grade === 'F' ? 1 : 0);
}

// 7. 1-Click CI/CD Council Reviewer Generator
if (args.includes('--setup-ci')) {
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const res = generateCiWorkflow(process.cwd(), isDryRun);
  if (isDryRun) {
    console.log(`${c.yellow}🧪 [DRY RUN]${c.reset} Previewing CI workflow at: ${res.path}\n`);
    console.log(res.content);
  } else if (res.created) {
    console.log(`${c.green}✅ [Created]${c.reset} GitHub Actions Council Review workflow at: ${c.dim}${res.path}${c.reset}`);
    console.log(`   Enforces test, lint, typecheck, and memory integrity on every PR.`);
  } else {
    console.log(`${c.green}✅ [Updated]${c.reset} GitHub Actions Council Review workflow at: ${c.dim}${res.path}${c.reset}`);
  }
  process.exit(0);
}

// 4. Autonomous Learning Engine
if (args.includes('--learn') || args[0] === 'learn') {
  const learnIdx = args.indexOf('--learn') !== -1 ? args.indexOf('--learn') + 1 : 1;
  const insight = args[learnIdx] && !args[learnIdx].startsWith('-') ? args[learnIdx] : null;

  if (!insight) {
    console.error(`${c.red}✖ Missing insight text for --learn.${c.reset}`);
    console.error('  Usage: npx antigravity-guild --learn "Always validate user input with zod" [--category security] [--team]');
    process.exit(1);
  }

  const categoryIdx = args.indexOf('--category') !== -1 ? args.indexOf('--category') + 1 : -1;
  const category = categoryIdx !== -1 && args[categoryIdx] && !args[categoryIdx].startsWith('-') ? args[categoryIdx] : null;

  const scope = args.includes('--team') ? 'team' : 'global';

  try {
    const res = recordLesson(insight, {
      scope,
      category,
      projectDir: process.cwd(),
    });
    if (res.isDuplicate) {
      console.log(`${c.yellow}ℹ [Deduplicated]${c.reset} ${res.message}`);
    } else {
      console.log(`${c.green}🧠 [Learned]${c.reset} ${res.message}`);
      if (res.scrubbed) {
        console.log(`${c.yellow}🛡️  [Sanitized]${c.reset} Sensitive credentials/tokens were automatically scrubbed.`);
      }
      console.log(`   ${c.dim}${res.entry}${c.reset}`);
    }
  } catch (err) {
    console.error(`${c.red}✖ Error recording lesson: ${err.message}${c.reset}`);
    process.exit(1);
  }
  process.exit(0);
}

// 5. Workspace Team Memory Initialization
if (args.includes('--team')) {
  initTeamMemory(process.cwd());
  process.exit(0);
}

// 6. Memory Vault Linter & Deduplicator
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