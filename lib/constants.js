'use strict';

// ---------------------------------------------------------------------------
// Constants & Definitions
// ---------------------------------------------------------------------------
const VERSION = '2.2.0';
const TOOL_NAME = 'OpenGuild';
const GLOBAL_DIR_NAME = '.openguild';

// ANSI helpers (zero dependencies)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  blue: '\x1b[34m',
};

// The 12-Expert Council Registry
const COUNCIL_MEMBERS = [
  { id: 'architect', icon: '🧠', title: 'Chief Software Architect', domain: 'System design, domain modeling & data normalization.' },
  { id: 'ui_ux', icon: '🎨', title: 'Principal UI/UX Lead', domain: 'Responsive design, accessible micro-interactions & aesthetics.' },
  { id: 'security', icon: '🛡️', title: 'Chief Security Officer', domain: 'SAIF compliance, auth validation, least-privilege & secret scrubbing.' },
  { id: 'staff_eng', icon: '⚡', title: 'Staff Full-Stack Engineer', domain: 'Modular, idiomatic, clean production code.' },
  { id: 'qa', icon: '🧪', title: 'Principal QA Lead', domain: 'Automated test suites, edge case verification & zero-regression proofs.' },
  { id: 'devops', icon: '🚀', title: 'DevOps Engineer', domain: 'Hermetic builds, CI pipelines, fast & reproducible execution.' },
  { id: 'google_cto', icon: '🌐', title: 'Google CTO Brain', domain: 'Internet-scale architecture, extreme scalability, AI-first design.' },
  { id: 'apple_cto', icon: '🍎', title: 'Apple CTO Brain', domain: 'Uncompromising product excellence, magical UX & premium aesthetics.' },
  { id: 'anthropic_safety', icon: '🧭', title: 'Anthropic Safety Brain', domain: 'Constitutional AI safety, user intent alignment & responsible engineering.' },
  { id: 'performance', icon: '⚡', title: 'Performance & Latency Specialist', domain: 'Algorithmic efficiency (O(n)), zero-copy caching, memory layout & async I/O.' },
  { id: 'database', icon: '🗄️', title: 'Database Reliability Engineer', domain: 'ACID transactions, schema migration safety, query plans & indexing.' },
  { id: 'product', icon: '💼', title: 'Product & Domain Strategy Lead', domain: 'Business logic edge cases, user story fidelity & preventing feature bloat.' }
];

// Domain Presets
const PRESETS = {
  full: {
    name: 'Full 12-Expert Guild',
    roles: ['architect', 'ui_ux', 'security', 'staff_eng', 'qa', 'devops', 'google_cto', 'apple_cto', 'anthropic_safety', 'performance', 'database', 'product'],
  },
  backend: {
    name: 'Backend & Distributed Systems',
    roles: ['architect', 'security', 'staff_eng', 'devops', 'google_cto', 'performance', 'database', 'anthropic_safety'],
  },
  web: {
    name: 'Full-Stack Web & Frontend',
    roles: ['architect', 'ui_ux', 'security', 'staff_eng', 'qa', 'apple_cto', 'performance', 'product', 'anthropic_safety'],
  },
  mobile: {
    name: 'Mobile & Client Apps',
    roles: ['architect', 'ui_ux', 'staff_eng', 'qa', 'apple_cto', 'performance', 'product'],
  },
  'ai-ml': {
    name: 'AI/ML & Data Engineering',
    roles: ['architect', 'google_cto', 'performance', 'database', 'anthropic_safety', 'qa', 'staff_eng'],
  },
};

// Default global memory documents
const DEFAULT_MEMORY_FILES = {
  'user_profile.md': `# Global Developer Profile
- **Preferences:** Clean modular architecture, strict type safety, zero bloat, high performance.
- **Testing Standard:** Deterministic automated test verification loop before any commit or release.
- **Style:** Self-documenting code with purposeful naming and concise comments explaining *why*.
`,
  'institutional_memory.md': `# Global Institutional Memory & Engineering Lessons
- Store timestamps in UTC with timezone offsets.
- Always implement graceful offline-first handling and explicit error boundaries for network calls.
- Never bypass type safety with 'any' unless strictly necessary and documented.
- Make all migrations backward-compatible to allow zero-downtime rolling deploys.
- Optimize database queries with appropriate indexes and avoid N+1 query patterns.
`,
  'security_standards.md': `# Global Security Standards (SAIF Compliance)
1. Zero Secret Leakage: Never log, commit, or expose .env files, private keys, or API tokens.
2. Defensive Input Sanitization: Validate and sanitize all external inputs against injection attacks.
3. Principle of Least Privilege: Enforce minimal permission boundaries in all service integrations.
4. Cryptographic Hygiene: Use industry-standard algorithms (AES-GCM, SHA-256) and secure key storage.
`,
  'council_registry.md': `# The 12-Expert Council Registry
1. 🧠 Chief Software Architect: System design, domain modeling & data normalization.
2. 🎨 Principal UI/UX Lead: Responsive design, accessible micro-interactions & aesthetics.
3. 🛡️ Chief Security Officer: SAIF compliance, auth validation, least-privilege & secret scrubbing.
4. ⚡ Staff Full-Stack Engineer: Modular, idiomatic, clean production code.
5. 🧪 Principal QA Lead: Automated test suites, edge case verification & zero-regression proofs.
6. 🚀 DevOps Engineer: Hermetic builds, CI pipelines, fast & reproducible execution.
7. 🌐 Google CTO Brain: Internet-scale architecture, extreme scalability, AI-first design.
8. 🍎 Apple CTO Brain: Uncompromising product excellence, magical UX & premium aesthetics.
9. 🧭 Anthropic Safety Brain: Constitutional AI safety, user intent alignment & responsible engineering.
10. ⚡ Performance & Latency Specialist: Algorithmic efficiency (O(n)), zero-copy caching, memory layout & async I/O.
11. 🗄️ Database Reliability Engineer: ACID transactions, schema migration safety, query plans & indexing.
12. 💼 Product & Domain Strategy Lead: Business logic edge cases, user story fidelity & preventing feature bloat.
`
};

function getBanner() {
  return `
${c.cyan}╔══════════════════════════════════════════════════════════════╗
║         ⚡ OPEN GUILD v${VERSION.padEnd(5)}: AI-NATIVE DEV ENGINE          ║
║     Persistent Memory • 12-Expert Council • MCP Server       ║
╚══════════════════════════════════════════════════════════════╝${c.reset}
`;
}

function getHelpText() {
  return `
${c.cyan}${c.bold}${TOOL_NAME}${c.reset} v${VERSION}
Zero-config persistent memory, 12-Expert Council, and Model Context Protocol (MCP) server.

${c.bold}USAGE${c.reset}
  ${c.dim}$${c.reset} npx antigravity-guild ${c.dim}[command] [options]${c.reset}

${c.bold}COMMANDS${c.reset}
  ${c.green}mcp${c.reset}                  Start the Model Context Protocol (MCP) server over stdio
  ${c.green}--setup-mcp [editor]${c.reset} 1-Click configure MCP for ${c.bold}claude${c.reset}, ${c.bold}cursor${c.reset}, ${c.bold}antigravity${c.reset}, or ${c.bold}all${c.reset}
  ${c.green}--team${c.reset}               Initialize Git-versioned workspace team memory (.openguild/)
  ${c.green}--lint-memory [--fix]${c.reset}Audit and clean memory vault for duplicate rules and bloat
  ${c.green}-i, --interactive${c.reset}    Launch step-by-step interactive configuration wizard
  ${c.green}--install-hooks${c.reset}      Install Git pre-commit invariant verification hook
  ${c.green}--export-memory [f]${c.reset}  Export global memory vault to portable JSON backup
  ${c.green}--import-memory <f>${c.reset}  Import and merge JSON memory archive into global vault

${c.bold}OPTIONS${c.reset}
  ${c.green}-p, --preset <name>${c.reset}  Apply domain preset (${c.bold}full${c.reset}, ${c.bold}backend${c.reset}, ${c.bold}web${c.reset}, ${c.bold}mobile${c.reset}, ${c.bold}ai-ml${c.reset})
  ${c.green}-h, --help${c.reset}           Show this help message
  ${c.green}-v, --version${c.reset}        Print the version number
  ${c.green}-s, --status${c.reset}         Inspect global memory hub and active council status
  ${c.green}-d, --dry-run${c.reset}        Preview detected stack and generated contracts without writing
  ${c.green}    --reset${c.reset}          Clear and re-initialize global memory hub

${c.bold}EXAMPLES${c.reset}
  # Quick zero-config workspace setup
  npx antigravity-guild

  # 1-Click auto-configure Claude Desktop and Cursor for OpenGuild MCP
  npx antigravity-guild --setup-mcp all

  # Initialize team-shared memory in current repository
  npx antigravity-guild --team

  # Audit and clean memory vault
  npx antigravity-guild --lint-memory --fix

${c.bold}LEARN MORE${c.reset}
  https://github.com/imHBpatel/antigravity-guild
`;
}

module.exports = {
  VERSION,
  TOOL_NAME,
  GLOBAL_DIR_NAME,
  c,
  COUNCIL_MEMBERS,
  PRESETS,
  DEFAULT_MEMORY_FILES,
  getBanner,
  getHelpText,
};
