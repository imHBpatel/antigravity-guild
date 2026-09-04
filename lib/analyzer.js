'use strict';

const fs = require('fs');
const path = require('path');
const { detectStack } = require('./detectors');
const { c, COUNCIL_MEMBERS } = require('./constants');

/**
 * Infer primary application domain from project vision text.
 *
 * @param {string} text
 * @returns {string} Domain category
 */
function inferDomain(text) {
  const lower = text.toLowerCase();
  if (lower.includes('agent') || lower.includes('agi') || lower.includes('autonomous') || lower.includes('llm') || lower.includes('ai')) {
    return 'AUTONOMOUS_AI';
  }
  if (lower.includes('crypto') || lower.includes('finance') || lower.includes('payment') || lower.includes('trading') || lower.includes('bank')) {
    return 'FINTECH_SECURITY';
  }
  if (lower.includes('collab') || lower.includes('realtime') || lower.includes('chat') || lower.includes('socket') || lower.includes('multiplayer')) {
    return 'REALTIME_DISTRIBUTED';
  }
  if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android') || lower.includes('flutter') || lower.includes('react native')) {
    return 'MOBILE_CLIENT';
  }
  if (lower.includes('shop') || lower.includes('commerce') || lower.includes('cart') || lower.includes('checkout')) {
    return 'ECOMMERCE_PLATFORM';
  }
  return 'SAAS_PLATFORM';
}

/**
 * Generate comprehensive engineering blueprint from an underspecified vision.
 *
 * @param {string} vision - The prompt or product idea.
 * @returns {string} Markdown blueprint.
 */
function analyzeVision(vision) {
  const domain = inferDomain(vision);

  let stackRec = {
    frontend: 'Next.js 15 (App Router) + React 19 + Tailwind CSS + Lucide Icons',
    backend: 'Node.js / TypeScript (Fastify or Hono) for sub-millisecond route latency',
    database: 'PostgreSQL (Supabase / Neon) + pgvector for semantic search + Redis (Upstash) for cache/queues',
    agentEngine: 'OpenGuild MCP Server + LangGraph / Neuro-symbolic Tool Loops',
  };

  let specificEdgeCases = [
    'Race conditions and concurrency deadlocks under high-frequency writes',
    'State synchronization and optimistic UI rollbacks on network drops',
    'Third-party rate limits with exponential backoff and dead-letter queues',
    'Session invalidation and CSRF/token rotation during multi-tab usage',
  ];

  if (domain === 'AUTONOMOUS_AI') {
    stackRec.frontend = 'React 19 + Vite / Next.js with streaming token UI and reactive status HUD';
    stackRec.backend = 'Python (FastAPI + uv) or Node.js with async streaming SSE / WebSockets';
    stackRec.database = 'PostgreSQL + pgvector / Qdrant for episodic memory + SQLite for local edge cache';
    stackRec.agentEngine = '16-Mind Supreme Guild Protocol: Perception -> Deliberation -> Tool Execution -> Self-Critique';
    specificEdgeCases = [
      'Infinite agent recursion loops and token budget exhaustion (mitigate with MaxIteration bounds)',
      'Prompt injection via external tool inputs (mitigate with SAIF tool parameter validation)',
      'Memory contamination from transient hallucinated outputs (mitigate with deterministic verification gates)',
      'Asynchronous tool timeout handling without dropping conversational thread state',
    ];
  } else if (domain === 'FINTECH_SECURITY') {
    stackRec.backend = 'Go (Gin/Fiber) or Rust (Axum) for memory safety and zero-allocation critical paths';
    stackRec.database = 'PostgreSQL with strict ACID transaction isolation (Serializable) + TimescaleDB';
    specificEdgeCases = [
      'Double-spend and idempotency key collision under retry storms',
      'Clock drift across distributed servers corrupting audit trails (use monotonic UTC clocks)',
      'Floating point rounding inaccuracies (strictly use Decimal / Integer minor units)',
      'Leakage of PCI/PII data into application log traces (use OpenGuild automated secret scrubbing)',
    ];
  }

  return `# 🔮 OpenGuild Supreme Auto-Analyst Blueprint
**Vision Statement:** "${vision.trim()}"
**Inferred Domain:** \`${domain}\` | **Analysis Engine:** 16-Mind Supreme Council

---

## 1. 🎯 Executive Synthesis & Latent Intent
- **Core Value Proposition:** Turn "${vision.trim()}" into a production-grade, highly reliable, and self-verifying application.
- **Primary User Personas:** Power users expecting zero latency, intuitive workflows, and transparent execution traces.
- **Architectural Tenet:** Autonomous, modular, zero-secret-leakage, and backed by deterministic verification proofs.

---

## 2. 🧩 Anticipated Edge Cases & Hidden Traps (Oracle Foresight)
${specificEdgeCases.map((ec, idx) => `${idx + 1}. **${ec.split(' (')[0]}**: ${ec}`).join('\n')}

---

## 3. 🏗️ Recommended Sovereign Tech Stack
- **Frontend & Interface:** ${stackRec.frontend}
- **Backend & APIs:** ${stackRec.backend}
- **Data & Vector Layer:** ${stackRec.database}
- **Cognitive & Agent Layer:** ${stackRec.agentEngine}

---

## 4. 🎨 Apple-Grade UI/UX & Ergonomics (Apple CTO & UI Lead)
- **Visual Polish:** Sleek modern typography (Inter / Geist), subtle micro-animations for state changes, and high-contrast accessible dark/light themes.
- **Tactile Feedback:** Optimistic UI updates with instant feedback; loading skeletons with zero layout-shift (CLS = 0).
- **Cognitive Load:** Progressive disclosure of complex settings with opinionated defaults.

---

## 5. 🛡️ SAIF Security & Constitutional Safeguards (CSO & Anthropic Safety)
- **Principle of Least Privilege:** Fine-grained API scopes and ephemeral session tokens.
- **Automated Secret Scrubbing:** Enforce OpenGuild zero-secret commitment across all persistent memory and logs.
- **Defense-in-Depth:** Input schema validation via Zod / Pydantic before touching database or execution runtime.

---

## 6. 🧪 Deterministic Verification Contracts (QA Lead)
- **Invariant Proof:** Automated test suite must pass with 100% deterministic reproducibility.
- **Null Safety:** Strict handling of nullable foreign keys, undefined API payloads, and network timeouts.
- **Pre-commit Gate:** All commits gated by \`npm test\` (or language equivalent) and OpenGuild memory linter.

---

## 7. 🚀 Phased Implementation Roadmap
1. **Phase 1 (Domain Core):** Data model entities, migrations, and core CRUD contracts.
2. **Phase 2 (Logic & Interaction):** API routes, authentication gates, and responsive UI components.
3. **Phase 3 (Autonomous & Intelligence):** Cognitive agent loops, persistent memory indexing, and background queues.
4. **Phase 4 (Hardening & Verification):** Invariant test coverage, load testing, and CI/CD Council Reviewer pipeline.
`;
}

/**
 * Analyze an existing project directory.
 *
 * @param {string} projectDir - Target workspace directory.
 * @returns {string} Markdown analysis report.
 */
function analyzeWorkspace(projectDir = process.cwd()) {
  let files = [];
  try {
    files = fs.readdirSync(projectDir);
  } catch {
    files = [];
  }

  const stack = detectStack(files, projectDir);
  const projectName = path.basename(projectDir);
  const teamDir = path.join(projectDir, '.openguild');
  const hasTeamMemory = fs.existsSync(teamDir);
  const hasGitignore = fs.existsSync(path.join(projectDir, '.gitignore'));
  const hasCi = fs.existsSync(path.join(projectDir, '.github', 'workflows'));

  return `# 🔮 OpenGuild Workspace Auto-Analysis: ${projectName}
**Directory:** \`${projectDir}\`
**Stack:** ${stack.lang} (${stack.framework}) using ${stack.pkgManager}${stack.isMonorepo ? ` [${stack.monorepoTool}]` : ''}

---

## 📊 Workspace Health & Infrastructure Audit
- **Language & Runtime:** \`${stack.lang}\` with package manager \`${stack.pkgManager}\`
- **Team Memory Vault:** ${hasTeamMemory ? '✅ Active (.openguild)' : '⚠️ Not initialized (run `npx antigravity-guild --team`)'}
- **Context Hygiene (.gitignore):** ${hasGitignore ? '✅ Present' : '⚠️ Missing (run `npx antigravity-guild`)'}
- **CI/CD Council Reviewer:** ${hasCi ? '✅ Present (.github/workflows)' : '⚠️ Not configured (run `npx antigravity-guild --setup-ci`)'}

## 🧪 Active Deterministic Verification Invariants
- **Test:** \`${stack.testCmd}\`
- **Lint:** \`${stack.lintCmd}\`
- **Typecheck:** \`${stack.typecheckCmd}\`

## 💡 Recommended Next Actions from the 16-Mind Supreme Council
1. **Enhance Invariants:** Verify that \`${stack.testCmd}\` covers critical boundary edge cases.
2. **Connect Team Memory:** Run \`npx antigravity-guild --team\` to synchronize architectural decisions with your team.
3. **Automate PR Audits:** Run \`npx antigravity-guild --setup-ci\` to run council audits on every GitHub pull request.
`;
}

/**
 * Universal Auto-Analyst entry point.
 *
 * @param {string} [input] - Vision description or directory path.
 * @param {object} [options]
 * @returns {string} Formatted analysis.
 */
function autoAnalyze(input, options = {}) {
  if (input && typeof input === 'string' && input.trim().length > 0) {
    // Check if input is a directory path that exists on disk
    if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
      return analyzeWorkspace(path.resolve(input));
    }
    // Otherwise treat as project vision / idea
    return analyzeVision(input);
  }

  // Default: analyze current working directory
  return analyzeWorkspace(options.projectDir || process.cwd());
}

module.exports = {
  inferDomain,
  analyzeVision,
  analyzeWorkspace,
  autoAnalyze,
};
