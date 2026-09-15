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
const { generateRepoMap } = require('../lib/repomap');
const { initMemoryBank, readMemoryBank } = require('../lib/memory_bank');
const { searchMemoryVaults } = require('../lib/hybrid_search');
const { resolveAllVaultConflicts } = require('../lib/conflict_resolver');
const { runCouncilSop } = require('../lib/council_sop');
const { packCodebase } = require('../lib/packager');
const { startInteractiveHud } = require('../lib/hud');
const { startDashboard } = require('../lib/dashboard');
const { runSelfHealing } = require('../lib/healer');
const { generatePrBlueprint, generateCommitMessage } = require('../lib/pr_architect');

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

// 1. Interactive Terminal HUD (Apple-Grade TUI)
if (args.includes('--ui') || args.includes('-u') || args[0] === 'ui') {
  startInteractiveHud({ cwd: process.cwd() });
  return;
}

// 2. Local Zero-Dependency Web Visualizer Dashboard
if (args.includes('--dashboard') || args.includes('--web') || args[0] === 'dashboard') {
  startDashboard({ cwd: process.cwd(), openBrowser: !args.includes('--no-open') }).then(dash => {
    console.log(`\n${c.green}🌐 [Dashboard Running]${c.reset} ${c.bold}${dash.url}${c.reset}`);
    console.log(`${c.dim}Press Ctrl+C to stop the dashboard server.${c.reset}\n`);
  }).catch(err => {
    console.error(`${c.red}✖ Failed to start dashboard: ${err.message}${c.reset}`);
    process.exit(1);
  });
  return;
}

// 3. Autonomous Self-Healing Test Runner
if (args.includes('--heal') || args[0] === 'heal') {
  const cmdIdx = args.indexOf('--test-cmd') !== -1 ? args.indexOf('--test-cmd') + 1 : -1;
  const customCmd = cmdIdx !== -1 && args[cmdIdx] && !args[cmdIdx].startsWith('-') ? args[cmdIdx] : null;
  const healResult = runSelfHealing({ cwd: process.cwd(), testCmd: customCmd });
  console.log(`\n# 🧬 OmniGuild Self-Healing Test Runner: ${healResult.status}`);
  console.log(healResult.message);
  if (healResult.diagnosis) {
    console.log(`\n- Error Type: ${healResult.diagnosis.errorType}`);
    console.log(`- File: ${healResult.diagnosis.failingFile}:${healResult.diagnosis.lineNumber || '?'}`);
    console.log(`- Suggestion: ${healResult.diagnosis.suggestion}`);
  }
  process.exit(healResult.healed ? 0 : 1);
}

// 4. Council PR Architect
if (args.includes('--pr') || args[0] === 'pr') {
  const prResult = generatePrBlueprint({ cwd: process.cwd() });
  console.log(prResult.markdown);
  process.exit(0);
}

// 5. Conventional Commit Generator
if (args.includes('--commit') || args[0] === 'commit') {
  const commitIdx = args.indexOf('--commit') !== -1 ? args.indexOf('--commit') + 1 : 1;
  const customMsg = args[commitIdx] && !args[commitIdx].startsWith('-') ? args[commitIdx] : '';
  const prData = generatePrBlueprint({ cwd: process.cwd() });
  const commitMsg = generateCommitMessage(prData.changedFiles, '', customMsg);
  console.log(`${c.green}💡 Suggested Commit Message:${c.reset}\n\n${commitMsg}\n`);
  process.exit(0);
}

// 6. MCP Server Subcommand (Zero-overhead stdio)
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

// 3. Council SOP Multi-Agent Review Pipeline (MetaGPT Superpower)
if (args.includes('--review') || args.includes('--sop') || args[0] === 'review') {
  const revIdx = args.indexOf('--review') !== -1
    ? args.indexOf('--review') + 1
    : args.indexOf('--sop') !== -1
      ? args.indexOf('--sop') + 1
      : 1;
  const target = args[revIdx] && !args[revIdx].startsWith('-') ? args[revIdx] : process.cwd();
  const result = runCouncilSop(target);
  console.log(result.reportMarkdown);
  process.exit(result.passed ? 0 : 1);
}

// 4. Smart Codebase Context Packager (Repomix Superpower)
if (args.includes('--pack') || args[0] === 'pack') {
  const packIdx = args.indexOf('--pack') !== -1 ? args.indexOf('--pack') + 1 : 1;
  const target = args[packIdx] && !args[packIdx].startsWith('-') ? args[packIdx] : process.cwd();
  const outIdx = args.indexOf('--output') !== -1 ? args.indexOf('--output') + 1 : -1;
  const outputFile = outIdx !== -1 && args[outIdx] && !args[outIdx].startsWith('-') ? args[outIdx] : null;
  const result = packCodebase(target, { outputFile });
  if (outputFile) {
    console.log(`${c.green}📦 [Packaged]${c.reset} ${result.fileCount} files into: ${c.dim}${result.outputPath}${c.reset} (~${result.totalTokens} tokens)`);
  } else {
    console.log(result.bundleMarkdown);
    console.log(`\n${c.dim}📦 Bundled ${result.fileCount} source files | ~${result.totalTokens} tokens${c.reset}`);
  }
  process.exit(0);
}

// 5. Probabilistic BM25 Okapi Memory Search (Mem0 Superpower)
if (args.includes('--search') || args.includes('-q') || args[0] === 'search') {
  const searchIdx = args.indexOf('--search') !== -1
    ? args.indexOf('--search') + 1
    : args.indexOf('-q') !== -1
      ? args.indexOf('-q') + 1
      : 1;
  const query = args[searchIdx] && !args[searchIdx].startsWith('-') ? args[searchIdx] : '';

  if (!query) {
    console.error(`${c.red}✖ Missing search query for --search.${c.reset}`);
    console.error('  Usage: npx antigravity-guild --search "auth tokens"');
    process.exit(1);
  }

  const memoryDirs = [
    { label: 'Global Memory Vault', dir: getGlobalMemoryPath() },
    { label: 'Workspace Team Memory', dir: path.join(process.cwd(), '.openguild') },
  ];
  const res = searchMemoryVaults(memoryDirs, query);
  console.log(res.markdown);
  process.exit(0);
}

// 4. Memory Conflict & Evolution Resolver
if (args.includes('--resolve-conflicts')) {
  const memoryDirs = [
    getGlobalMemoryPath(),
    path.join(process.cwd(), '.openguild'),
  ];
  const res = resolveAllVaultConflicts(memoryDirs, { dryRun: args.includes('--dry-run') });
  console.log(res.markdown);
  process.exit(0);
}

// 5. Autonomous Auto-Analyst & Architecture Blueprint Synthesis
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

// 4. Token-Efficient AST Symbol Repo-Map (Aider Superpower)
if (args.includes('--repomap') || args.includes('-m') || args[0] === 'repomap') {
  const mapIdx = args.indexOf('--repomap') !== -1
    ? args.indexOf('--repomap') + 1
    : args.indexOf('-m') !== -1
      ? args.indexOf('-m') + 1
      : 1;
  const queryArg = args[mapIdx] && !args[mapIdx].startsWith('-') ? args[mapIdx] : '';
  const res = generateRepoMap(process.cwd(), { query: queryArg });
  console.log(res.mapMarkdown);
  console.log(`\n${c.dim}📊 Analyzed ${res.filesCount} source files | ${res.symbolsCount} symbols extracted | ~${res.tokenEstimate} tokens${c.reset}`);
  process.exit(0);
}

// 5. Living Memory Bank & Active Task Continuity (Cline Superpower)
if (args.includes('--memory-bank')) {
  initMemoryBank(process.cwd(), false);
  const bank = readMemoryBank(process.cwd());
  console.log(bank.text);
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
// 1. Global Persistent Memory Hub & Team Memory
// ---------------------------------------------------------------------------
const memHub = isDryRun
  ? { path: getGlobalMemoryPath(), created: false }
  : initMemoryHub(shouldReset);

// Auto-initialize or connect workspace team memory (.openguild/)
initTeamMemory(cwd, isDryRun);

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
// 3. Zero-Friction MCP Auto-Config for ALL Editors
// ---------------------------------------------------------------------------
setupEditorMcp('all', cwd, isDryRun);

// ---------------------------------------------------------------------------
// 4. AI Agent Rule Synthesis (With Autonomous Zero-Prompt Pre-Flight Mandate)
// ---------------------------------------------------------------------------
const contracts = synthesizeContracts(cwd, projectName, memHub.path, stack, selectedPreset, isDryRun);

console.log(`${c.green}✅ [Synthesized]${c.reset} AI Agent Rules (Zero-Prompt Mandate Activated)`);
for (const item of contracts) {
  console.log(`  • ${item.label}`);
}

// ---------------------------------------------------------------------------
// 5. Context Hygiene (.gitignore)
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
// 6. Auto-Lint & Deduplicate Memory Vault
// ---------------------------------------------------------------------------
console.log(`\n${c.cyan}${c.bold}🧹 Auto-Cleaning Memory Vault...${c.reset}`);
lintAllMemory(cwd, true); // autofix = true, silently dedup

// ---------------------------------------------------------------------------
// 7. Security Audit (SAIF 2.0 — Auto-Scan)
// ---------------------------------------------------------------------------
console.log(`\n${c.cyan}${c.bold}🛡️  Running SAIF 2.0 Security Scan...${c.reset}`);
const auditResult = auditSecurity(cwd);
if (auditResult.grade === 'A+' || auditResult.grade === 'A') {
  console.log(`  ${c.green}✔ Security Grade: ${c.bold}${auditResult.grade}${c.reset} ${c.green}(${auditResult.totalFiles} files scanned, ${auditResult.issues.length} issues)${c.reset}`);
} else {
  console.log(`  ${c.yellow}⚠ Security Grade: ${c.bold}${auditResult.grade}${c.reset} ${c.yellow}(${auditResult.issues.length} issues found in ${auditResult.totalFiles} files)${c.reset}`);
  for (const issue of auditResult.issues.slice(0, 5)) {
    console.log(`    ${c.red}•${c.reset} ${c.dim}${issue.file}:${issue.line}${c.reset} — ${issue.type}`);
  }
  if (auditResult.issues.length > 5) {
    console.log(`    ${c.dim}... and ${auditResult.issues.length - 5} more. Run ${c.bold}npx antigravity-guild --audit${c.reset}${c.dim} for full report.${c.reset}`);
  }
}

// ---------------------------------------------------------------------------
// 8. Token Profiler (Context Diet Snapshot)
// ---------------------------------------------------------------------------
const tokenResult = profileTokens(cwd);
console.log(`\n${c.cyan}${c.bold}⚡ Context Diet Snapshot${c.reset}`);
console.log(`  Token Load: ${c.bold}${tokenResult.totalTokens}${c.reset} tokens | Grade: ${c.bold}${tokenResult.efficiency.grade}${c.reset} ${tokenResult.efficiency.badge}`);
console.log(`  ${c.dim}Savings vs monolithic prompt: ~${tokenResult.savingsPercent}% reduction (~$${tokenResult.costSavings}/1K turns)${c.reset}`);

// ---------------------------------------------------------------------------
// 9. Git Pre-Commit Hook (Auto-Install if .git exists)
// ---------------------------------------------------------------------------
const gitDir = path.join(cwd, '.git');
if (fs.existsSync(gitDir) && !isDryRun) {
  installPreCommitHook(cwd);
} else if (fs.existsSync(gitDir) && isDryRun) {
  console.log(`${c.dim}🪝 [Dry-Run] Would install pre-commit invariant hook.${c.reset}`);
} else {
  console.log(`${c.dim}🪝 [Skipped] No .git directory found. Pre-commit hook can be installed after ${c.bold}git init${c.reset}${c.dim}.${c.reset}`);
}

// ---------------------------------------------------------------------------
// 10. GitHub Actions CI Workflow (Auto-Generate if .git exists)
// ---------------------------------------------------------------------------
if (fs.existsSync(gitDir)) {
  const ciRes = generateCiWorkflow(cwd, isDryRun);
  if (isDryRun) {
    console.log(`${c.dim}🏗️  [Dry-Run] Would generate GitHub Actions CI workflow.${c.reset}`);
  } else if (ciRes.created) {
    console.log(`${c.green}✅ [Generated]${c.reset} GitHub Actions CI workflow at: ${c.dim}${ciRes.path}${c.reset}`);
  } else {
    console.log(`${c.dim}🏗️  [Verified]${c.reset} GitHub Actions CI workflow already exists.`);
  }
} else {
  console.log(`${c.dim}🏗️  [Skipped] No .git directory. CI workflow will be generated after ${c.bold}git init${c.reset}${c.dim}.${c.reset}`);
}

// ---------------------------------------------------------------------------
// ⚡ ALL-IN-ONE COMPLETION: "It Just Works" + Capability Discovery
// ---------------------------------------------------------------------------
console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════╗
║     🍎  "It Just Works" — ONE COMMAND, ZERO FRICTION         ║
║     🎉  PROJECT FULLY ARMED WITH SOVEREIGN AI MEMORY         ║
╚══════════════════════════════════════════════════════════════╝${c.reset}

${c.green}${c.bold}Project:${c.reset} ${c.bold}${projectName}${c.reset}  |  Preset: ${c.bold}${PRESETS[selectedPreset].name}${c.reset}

${c.green}${c.bold}✅ What was done automatically:${c.reset}
  ${c.green}✔${c.reset} Global Memory Hub linked       — ${c.dim}${memHub.path}${c.reset}
  ${c.green}✔${c.reset} Workspace Team Memory created   — ${c.dim}.openguild/${c.reset}
  ${c.green}✔${c.reset} MCP Tools registered for        — Cursor, Claude, Antigravity, VS Code, Windsurf
  ${c.green}✔${c.reset} AI Rules synthesized            — AGENTS.md, .cursorrules, .gemini/rules.md
  ${c.green}✔${c.reset} Zero-Prompt Mandate activated   — AI auto-reads memory on every interaction
  ${c.green}✔${c.reset} .gitignore context hygiene      — Secrets and AI noise excluded
  ${c.green}✔${c.reset} Memory vault cleaned & deduped  — Zero bloat, zero duplication
  ${c.green}✔${c.reset} SAIF 2.0 security scan          — Grade: ${c.bold}${auditResult.grade}${c.reset}
  ${c.green}✔${c.reset} Context diet profiled           — ${c.bold}${tokenResult.totalTokens}${c.reset} tokens (Grade: ${c.bold}${tokenResult.efficiency.grade}${c.reset})
  ${c.green}✔${c.reset} Git hooks & CI workflow         — Pre-commit invariants ${fs.existsSync(gitDir) ? 'installed' : 'ready after git init'}

${c.magenta}${c.bold}🍎 The Apple CEO Philosophy ("It Just Works"):${c.reset}
  Your AI now operates autonomously. You will ${c.bold}never${c.reset} need to:
  • Write special prompts to activate memory or council roles
  • Tell the AI to run tests or check for security issues
  • Remind the AI about past lessons or project conventions
  Just type naturally. Even ${c.bold}"fix this bug"${c.reset} triggers the full 16-Mind Council.

${c.cyan}${c.bold}📖 Capability Discovery — Everything You Can Do:${c.reset}

  ${c.yellow}In your AI editor (zero config needed):${c.reset}
  ${c.dim}Just open Cursor / Claude / Antigravity and chat. Memory + Council + Verification
  are active on every single prompt automatically.${c.reset}

  ${c.yellow}Teach your AI something new (works across ALL projects):${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --learn "Always use zod to validate request bodies"
  ${c.dim}↳ Saves to global memory. Auto-scrubs secrets. Every project inherits it.${c.reset}

  ${c.yellow}Deep security audit with full report:${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --audit
  ${c.dim}↳ Scans for API keys, code injection, SQL hazards, and .env leaks. Assigns A+ to F grade.${c.reset}

  ${c.yellow}Run deterministic verification (tests + lint + types):${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --verify
  ${c.dim}↳ Runs your project's native test/lint/type commands and produces certified proof.${c.reset}

  ${c.yellow}Auto-generate architecture blueprint from a rough idea:${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --analyze "AI-powered invoice tracker"
  ${c.dim}↳ Produces full blueprint: domain model, tech stack, edge cases, security plan.${c.reset}

  ${c.yellow}See how token-efficient your AI rules are:${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --tokens
  ${c.dim}↳ Benchmarks token weight vs monolithic prompts. Shows cost savings per 1K turns.${c.reset}

  ${c.yellow}Export / Import memory to another machine:${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --export-memory backup.json
  ${c.green}$${c.reset} npx antigravity-guild --import-memory backup.json
  ${c.dim}↳ Portable memory vault. Share across machines or back up your brain.${c.reset}

  ${c.yellow}Check global memory health & status:${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --status
  ${c.dim}↳ Dashboard of all memory files, sizes, last modified dates, and council status.${c.reset}

  ${c.yellow}Clean duplicate or bloated memory rules:${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --lint-memory --fix
  ${c.dim}↳ Deduplicates and trims redundant rules. Keeps your memory vault lean.${c.reset}

  ${c.yellow}Choose a domain-specific expert council:${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --preset backend    ${c.dim}(API, DB, Security, Scale)${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --preset web         ${c.dim}(UI/UX, Frontend, Apple UX)${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --preset mobile      ${c.dim}(iOS/Android, Apple CTO)${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --preset ai-ml       ${c.dim}(ML, Data, Vector/RAG)${c.reset}
  ${c.green}$${c.reset} npx antigravity-guild --preset agi         ${c.dim}(Multi-Agent, Cognitive)${c.reset}

${c.dim}That's it. One command did 99.99% of the work. Your AI is fully armed.${c.reset}
`);