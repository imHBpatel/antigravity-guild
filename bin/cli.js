#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VERSION = '1.0.0';
const TOOL_NAME = 'OpenGuild';
const GLOBAL_DIR_NAME = '.openguild';

// ANSI helpers (zero dependencies)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
};

// ---------------------------------------------------------------------------
// CLI Flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(`${TOOL_NAME} v${VERSION}`);
  process.exit(0);
}

const shouldReset = args.includes('--reset');

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------
console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════╗
║              ⚡ OPEN GUILD: AI-NATIVE DEV ENGINE             ║
║     Persistent Memory • 9-Expert Council • Zero Friction     ║
╚══════════════════════════════════════════════════════════════╝${c.reset}
`);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const cwd = process.cwd();
const projectName = path.basename(cwd);
const homeDir = os.homedir();
const globalMemDir = path.join(homeDir, GLOBAL_DIR_NAME, 'memory');

// ---------------------------------------------------------------------------
// Safety: verify write permissions
// ---------------------------------------------------------------------------
try {
  fs.accessSync(cwd, fs.constants.W_OK);
} catch {
  console.error(`${c.red}✖ Error: No write permission in ${cwd}${c.reset}`);
  console.error('  Run this command from a directory you own.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Global Persistent Memory Hub (~/.openguild/memory)
// ---------------------------------------------------------------------------
if (shouldReset && fs.existsSync(globalMemDir)) {
  fs.rmSync(globalMemDir, { recursive: true, force: true });
  console.log(`${c.yellow}🔄 [Reset] Cleared global memory. Re-initializing…${c.reset}`);
}

if (!fs.existsSync(globalMemDir)) {
  fs.mkdirSync(globalMemDir, { recursive: true });

  write(globalMemDir, 'user_profile.md', `# Global Developer Profile
- **Preferences:** Clean modular architecture, strict type safety, zero bloat.
- **Testing Standard:** Deterministic automated test verification loop before commit.
`);

  write(globalMemDir, 'institutional_memory.md', `# Global Institutional Memory & Lessons
- Store timestamps in UTC with timezone offsets.
- Always implement graceful offline-first handling for network calls.
- Never bypass type safety with 'any' unless strictly necessary.
`);

  write(globalMemDir, 'security_standards.md', `# Global Security Contract (SAIF)
1. Zero secret leakage: Never log or commit .env, API keys, or service tokens.
2. Sanitize all external inputs against injection attacks.
3. Enforce least-privilege access patterns in all service integrations.
`);

  write(globalMemDir, 'council_registry.md', `# The 9-Expert Council
1. 🧠 Chief Software Architect: System design & database normalization.
2. 🎨 Principal UI/UX Lead: Responsive design, accessible micro-interactions.
3. 🛡️ Chief Security Officer: SAIF compliance, auth validation, secret scrubbing.
4. ⚡ Staff Full-Stack Engineer: Modular, idiomatic production code.
5. 🧪 Principal QA Lead: Automated test suites and zero-regression proofs.
6. 🚀 DevOps Engineer: Hermetic builds, CI pipelines, fast execution.
7. 🌐 Google CTO Brain: Internet-scale architecture, extreme scalability, AI-first design, and world-class innovation.
8. 🍎 Apple CTO Brain: Uncompromising product excellence, magical user experience, premium aesthetics, and hardware-software harmony.
9. 🧭 Anthropic Safety Brain: AI safety-first engineering, explainable & transparent code, alignment with user intent, responsible scaling, and constitutional coding principles.
`);

  console.log(`${c.green}✨ [Created]${c.reset} Global Memory Hub at: ${c.dim}${globalMemDir}${c.reset}`);
} else {
  console.log(`${c.cyan}🧠 [Connected]${c.reset} Global Memory Hub at: ${c.dim}${globalMemDir}${c.reset}`);
}

// ---------------------------------------------------------------------------
// 2. Detect Workspace Stack
// ---------------------------------------------------------------------------
const files = safeReadDir(cwd);
const stack = detectStack(files, cwd);

console.log(
  `${c.magenta}🔍 [Detected]${c.reset} ${c.bold}${stack.lang}${c.reset}` +
  ` (${stack.framework}) using ${c.bold}${stack.pkgManager}${c.reset}`
);

// ---------------------------------------------------------------------------
// 3. Synthesize AI Agent Rules
// ---------------------------------------------------------------------------
const geminiDir = path.join(cwd, '.gemini');
mkdirSafe(geminiDir);

const universalRule = buildRuleContent(projectName, globalMemDir, stack);

write(geminiDir, 'rules.md', universalRule);
write(cwd, 'AGENTS.md', universalRule);
write(cwd, '.cursorrules', universalRule);

console.log(`${c.green}✅ [Synthesized]${c.reset}
  • Antigravity IDE Contract: ${c.dim}.gemini/rules.md${c.reset}
  • Universal Agent Standard:  ${c.dim}AGENTS.md${c.reset}
  • Cursor IDE Contract:       ${c.dim}.cursorrules${c.reset}`);

// ---------------------------------------------------------------------------
// 4. Context Hygiene (.gitignore)
// ---------------------------------------------------------------------------
enforceGitignore(cwd);

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
console.log(`
${c.green}${c.bold}🎉 [Success]${c.reset} Project "${c.bold}${projectName}${c.reset}" configured!
${c.dim}Open your AI-powered editor and start prompting.${c.reset}
`);

// ===========================================================================
// Helper Functions
// ===========================================================================

/**
 * Safely write a file, logging errors instead of crashing.
 */
function write(dir, filename, content) {
  try {
    fs.writeFileSync(path.join(dir, filename), content, 'utf8');
  } catch (err) {
    console.error(`${c.red}✖ Failed to write ${filename}: ${err.message}${c.reset}`);
    process.exit(1);
  }
}

/**
 * Read a directory safely, returning an empty array on failure.
 */
function safeReadDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

/**
 * Create a directory if it doesn't exist.
 */
function mkdirSafe(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Auto-detect language, framework, package manager, and tool commands.
 */
function detectStack(files, projectDir) {
  const result = {
    lang: 'Polyglot / Generic',
    framework: 'Standard',
    pkgManager: 'npm',
    testCmd: 'echo "No test runner configured"',
    lintCmd: 'echo "No linter configured"',
    typecheckCmd: 'echo "No typechecker configured"',
  };

  if (files.includes('package.json')) {
    try {
      const raw = fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw);
      const isTs = files.includes('tsconfig.json');
      result.lang = isTs ? 'TypeScript' : 'JavaScript';

      // Package manager detection
      if (files.includes('pnpm-lock.yaml')) result.pkgManager = 'pnpm';
      else if (files.includes('yarn.lock')) result.pkgManager = 'yarn';
      else if (files.includes('bun.lockb')) result.pkgManager = 'bun';
      else result.pkgManager = 'npm';

      // Framework detection
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps['next']) result.framework = 'Next.js';
      else if (deps['@sveltejs/kit']) result.framework = 'SvelteKit';
      else if (deps['nuxt']) result.framework = 'Nuxt';
      else if (deps['react']) result.framework = 'React';
      else if (deps['vue']) result.framework = 'Vue';
      else if (deps['svelte']) result.framework = 'Svelte';
      else if (deps['express']) result.framework = 'Express';
      else if (deps['fastify']) result.framework = 'Fastify';
      else if (deps['hono']) result.framework = 'Hono';
      else if (deps['@nestjs/core']) result.framework = 'NestJS';

      // Tool commands
      if (pkg.scripts?.test) result.testCmd = `${result.pkgManager} test`;
      if (pkg.scripts?.lint) result.lintCmd = `${result.pkgManager} run lint`;
      if (isTs) result.typecheckCmd = `${result.pkgManager} run tsc --noEmit`;
    } catch (err) {
      console.warn(`${c.yellow}⚠ Could not parse package.json: ${err.message}${c.reset}`);
    }
  } else if (files.includes('pyproject.toml') || files.includes('requirements.txt')) {
    result.lang = 'Python';
    result.pkgManager = files.includes('uv.lock') ? 'uv'
      : files.includes('poetry.lock') ? 'poetry' : 'pip';
    result.testCmd = 'pytest -v';
    result.lintCmd = 'ruff check . || flake8';
    result.typecheckCmd = 'mypy .';

    // Python framework detection
    try {
      const content = files.includes('pyproject.toml')
        ? fs.readFileSync(path.join(projectDir, 'pyproject.toml'), 'utf8')
        : fs.readFileSync(path.join(projectDir, 'requirements.txt'), 'utf8');
      if (/django/i.test(content)) result.framework = 'Django';
      else if (/fastapi/i.test(content)) result.framework = 'FastAPI';
      else if (/flask/i.test(content)) result.framework = 'Flask';
    } catch { /* non-critical */ }
  } else if (files.includes('Cargo.toml')) {
    result.lang = 'Rust';
    result.pkgManager = 'cargo';
    result.testCmd = 'cargo test';
    result.lintCmd = 'cargo clippy';
    result.typecheckCmd = 'cargo check';
  } else if (files.includes('go.mod')) {
    result.lang = 'Go';
    result.pkgManager = 'go';
    result.testCmd = 'go test ./...';
    result.lintCmd = 'golangci-lint run';
    result.typecheckCmd = 'go vet ./...';
  } else if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
    result.lang = 'C# / .NET';
    result.pkgManager = 'dotnet';
    result.testCmd = 'dotnet test';
    result.lintCmd = 'dotnet format --verify-no-changes';
    result.typecheckCmd = 'dotnet build --no-restore';
  } else if (files.includes('build.gradle') || files.includes('build.gradle.kts') || files.includes('pom.xml')) {
    result.lang = 'Java / Kotlin';
    result.pkgManager = files.includes('pom.xml') ? 'maven' : 'gradle';
    result.testCmd = result.pkgManager === 'maven' ? 'mvn test' : './gradlew test';
    result.lintCmd = result.pkgManager === 'maven' ? 'mvn checkstyle:check' : './gradlew check';
    result.typecheckCmd = result.pkgManager === 'maven' ? 'mvn compile' : './gradlew compileJava';
  }

  return result;
}

/**
 * Build the universal AI agent rule content.
 */
function buildRuleContent(name, memPath, stack) {
  return `# Sovereign AI Engineering Guild: ${name}

## 1. Global Brain Connection
- **Global Memory Path:** \`${memPath}\`
- Always review and apply lessons from \`institutional_memory.md\` and \`security_standards.md\`.

## 2. Multi-Role Expert Council
When assisting on this project, operate as the **9-Expert Council** (Architect, UI/UX Lead, Security Officer, Staff Engineer, QA Lead, DevOps, Google CTO, Apple CTO, Anthropic Safety).

Each expert reviews every significant decision:
- 🧠 **Architect** validates structure and scalability.
- 🎨 **UI/UX Lead** ensures intuitive, accessible interfaces.
- 🛡️ **Security Officer** audits for vulnerabilities and data exposure.
- ⚡ **Staff Engineer** enforces clean, idiomatic, modular code.
- 🧪 **QA Lead** demands automated test coverage and regression proofs.
- 🚀 **DevOps** ensures reproducible builds and deployment readiness.
- 🌐 **Google CTO Brain** pushes for internet-scale architecture and AI-first innovation.
- 🍎 **Apple CTO Brain** demands premium aesthetics and magical user experience.
- 🧭 **Anthropic Safety Brain** enforces explainable code, user-intent alignment, and responsible engineering.

## 3. Deterministic Verification Invariants
Before marking any feature as complete, execute:
- **Test Suite:** \`${stack.testCmd}\`
- **Linter:** \`${stack.lintCmd}\`
- **Typecheck:** \`${stack.typecheckCmd}\`

> [!IMPORTANT]
> Never report tasks as complete if automated tests or linters fail.

## 4. Code Quality Standards
- Write self-documenting code with clear naming conventions.
- Every complex block must include a comment explaining *why*, not just *what*.
- Fail gracefully — never swallow errors silently.
- Handle edge cases explicitly, not optimistically.
`;
}

/**
 * Enforce .gitignore with sensible defaults.
 */
function enforceGitignore(projectDir) {
  const gitignorePath = path.join(projectDir, '.gitignore');
  const entries = [
    '\n# === OpenGuild Context Hygiene ===',
    'node_modules/',
    '.venv/',
    'venv/',
    '__pycache__/',
    'dist/',
    'build/',
    'target/',
    '.next/',
    '*.log',
    '.env',
    '.env.*',
    '*.key',
    '*.pem',
  ];

  if (!fs.existsSync(gitignorePath)) {
    write(projectDir, '.gitignore', entries.join('\n') + '\n');
    console.log(`${c.green}✅ [Generated]${c.reset} .gitignore with context hygiene rules.`);
  } else {
    const existing = fs.readFileSync(gitignorePath, 'utf8');
    const missing = entries.filter(e => e.trim() && !existing.includes(e.trim()));
    if (missing.length > 0) {
      fs.appendFileSync(gitignorePath, '\n' + missing.join('\n') + '\n');
      console.log(`${c.green}✅ [Updated]${c.reset} .gitignore with missing exclusions.`);
    }
  }
}

/**
 * Print CLI help text.
 */
function printHelp() {
  console.log(`
${c.cyan}${c.bold}${TOOL_NAME}${c.reset} v${VERSION}
Zero-config persistent memory and multi-role AI expert guild.

${c.bold}USAGE${c.reset}
  ${c.dim}$${c.reset} npx antigravity-guild ${c.dim}[options]${c.reset}

${c.bold}OPTIONS${c.reset}
  ${c.green}-h, --help${c.reset}      Show this help message
  ${c.green}-v, --version${c.reset}   Print the version number
  ${c.green}    --reset${c.reset}      Clear and re-initialize global memory

${c.bold}WHAT IT DOES${c.reset}
  1. Creates a global memory hub at ${c.dim}~/.openguild/memory/${c.reset}
     Stores developer preferences, security standards, and lessons
     that persist across all your projects.

  2. Auto-detects your tech stack (language, framework, package manager)
     and configures the right test, lint, and typecheck commands.

  3. Generates AI agent rule files:
     ${c.dim}.gemini/rules.md${c.reset}  — Antigravity IDE / Gemini
     ${c.dim}AGENTS.md${c.reset}         — Universal agent standard
     ${c.dim}.cursorrules${c.reset}      — Cursor IDE

  4. Enforces .gitignore hygiene to keep secrets and heavy
     directories out of your AI's context window.

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Set up a new project${c.reset}
  mkdir my-app && cd my-app && npm init -y
  npx antigravity-guild

  ${c.dim}# Re-initialize global memory${c.reset}
  npx antigravity-guild --reset

${c.bold}LEARN MORE${c.reset}
  https://github.com/imHBpatel/antigravity-guild
`);
}