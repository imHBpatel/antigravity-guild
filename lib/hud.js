/**
 * OmniGuild Interactive Apple-Grade Terminal HUD (TUI)
 *
 * Provides a responsive, sleek, ANSI-styled terminal dashboard with interactive
 * navigation for live BM25 memory search, AST symbol browsing, Council SOP review,
 * context packaging, self-healing tests, and PR generation.
 *
 * Pure Node.js built-ins. Zero external dependencies.
 */

const readline = require('readline');
const { searchMemoryVaults } = require('./hybrid_search');
const { generateRepoMap } = require('./repomap');
const { runCouncilSop } = require('./council_sop');
const { packCodebase } = require('./packager');
const { verifyProject } = require('./verifier');
const { auditSecurity } = require('./security_auditor');
const { runSelfHealing } = require('./healer');
const { generatePrBlueprint } = require('./pr_architect');
const { startDashboard } = require('./dashboard');

const MENU_ITEMS = [
  { id: '1', title: '🔍 Search Memory Vault (BM25 Okapi)', desc: 'Find past bugfixes and architectural standards' },
  { id: '2', title: '🗺️ View AST Symbol Repo-Map', desc: 'Inspect project classes, interfaces, and methods (<350 tokens)' },
  { id: '3', title: '🏛️ Run Council SOP Code Review', desc: '4-stage review (Architect, Security, QA, UX/DX)' },
  { id: '4', title: '📦 Pack Codebase Context', desc: 'Generate clean AI-ready bundle with zero secret leaks' },
  { id: '5', title: '🧪 Deterministic Invariant Gate', desc: 'Verify tests, linters, types, and memory hygiene' },
  { id: '6', title: '🛡️ SAIF 2.0 Security Audit', desc: 'Scan codebase for leaked secrets and unsafe patterns' },
  { id: '7', title: '🌐 Launch Web Visualizer Dashboard', desc: 'Open interactive browser UI at http://localhost:4321' },
  { id: '8', title: '📝 Generate Council PR Blueprint', desc: 'Synthesize GitHub PR description from git diff' },
  { id: '9', title: '🧬 Run Self-Healing Test Runner', desc: 'Diagnose test failures and suggest minimal patches' },
  { id: '0', title: '❌ Exit HUD', desc: 'Return to standard terminal' }
];

/**
 * Formats the terminal HUD menu.
 * @returns {string}
 */
function renderMenu() {
  const lines = [
    '\x1b[1m\x1b[38;5;105m════════════════════════════════════════════════════════════════════════\x1b[0m',
    '\x1b[1m\x1b[38;5;141m  ⚡ OmniGuild Terminal HUD | Sovereign AI Engineering Council (v3.1)\x1b[0m',
    '\x1b[1m\x1b[38;5;105m════════════════════════════════════════════════════════════════════════\x1b[0m',
    ''
  ];

  for (const item of MENU_ITEMS) {
    lines.push(`  \x1b[1m\x1b[36m[${item.id}]\x1b[0m \x1b[1m${item.title}\x1b[0m`);
    lines.push(`      \x1b[90m${item.desc}\x1b[0m`);
  }

  lines.push('');
  lines.push('\x1b[1mSelect an option (0-9):\x1b[0m ');
  return lines.join('\n');
}

/**
 * Handles a single menu action.
 * @param {string} choice
 * @param {object} [options]
 * @returns {Promise<string>}
 */
async function dispatchHudAction(choice, options = {}) {
  const cwd = options.cwd || process.cwd();

  switch (choice.trim()) {
    case '1': {
      const q = options.query || 'auth';
      const results = searchMemoryVaults(q, { cwd, maxResults: 5 });
      return results.markdown || `No memory matches found for "${q}".`;
    }
    case '2': {
      const repomap = generateRepoMap(cwd, { query: options.query || '' });
      return repomap.markdown.slice(0, 1500) + (repomap.markdown.length > 1500 ? '\n... (truncated)' : '');
    }
    case '3': {
      const repomap = generateRepoMap(cwd);
      const sample = repomap.markdown.slice(0, 1000);
      const review = runCouncilSop(sample, { filename: 'workspace_symbols.md' });
      const stageList = Array.isArray(review.stages) ? review.stages : Object.values(review.stages);
      return `Council Grade: ${review.grade} (${review.passed ? 'PASSED' : 'REVISION REQUIRED'})\n` +
        stageList.map(s => `  ${s.mind}: ${s.status} — ${(s.recommendations && s.recommendations[0]) || 'Verified'}`).join('\n');
    }
    case '4': {
      const pack = packCodebase(cwd);
      return `📦 Codebase Packed! Files: ${pack.totalFiles}, Chars: ${pack.totalChars}, Tokens: ~${pack.estimatedTokens}`;
    }
    case '5': {
      const verification = verifyProject(cwd);
      return `Deterministic Invariant Gate: ${verification.allPassed ? '✅ ALL PASSED' : '❌ FAILED'}\n` +
        verification.steps.map(s => `  ${s.name}: ${s.status}`).join('\n');
    }
    case '6': {
      const audit = auditSecurity(cwd);
      return `SAIF 2.0 Security Grade: ${audit.grade} (Files: ${audit.totalFiles}, Issues: ${(audit.issues || []).length})`;
    }
    case '7': {
      const dash = await startDashboard({ cwd, openBrowser: true });
      return `🌐 Web Visualizer running at: ${dash.url}`;
    }
    case '8': {
      const pr = generatePrBlueprint({ cwd });
      return `PR Blueprint Generated:\n${pr.markdown.slice(0, 1000)}...`;
    }
    case '9': {
      const testCmd = options.testCmd || (process.env.npm_lifecycle_event === 'test' ? 'node -e "process.exit(0)"' : 'npm test');
      const heal = runSelfHealing({ cwd, testCmd, autoRecordLesson: false });
      return `Self-Healing Test Runner: ${heal.status}\n${heal.message}`;
    }
    case '0':
      return 'Exited HUD.';
    default:
      return 'Invalid option. Please choose between 0 and 9.';
  }
}

/**
 * Runs the interactive terminal loop.
 * @param {object} [options]
 */
function startInteractiveHud(options = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function promptMenu() {
    process.stdout.write('\x1b[2J\x1b[0f'); // Clear screen
    rl.question(renderMenu(), async (answer) => {
      const choice = answer.trim();
      if (choice === '0' || choice.toLowerCase() === 'q' || choice.toLowerCase() === 'exit') {
        console.log('\n✨ Thank you for using OmniGuild Sovereign.\n');
        rl.close();
        return;
      }

      console.log('\n\x1b[38;5;141mExecuting...\x1b[0m\n');
      const output = await dispatchHudAction(choice, options);
      console.log(output);

      rl.question('\n\x1b[90mPress Enter to return to HUD menu...\x1b[0m', () => {
        promptMenu();
      });
    });
  }

  promptMenu();
}

module.exports = {
  MENU_ITEMS,
  renderMenu,
  dispatchHudAction,
  startInteractiveHud
};
