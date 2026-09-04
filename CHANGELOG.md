# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-09-04

### Added
- **Context Token Profiler & Optimizer (`lib/token_profiler.js`, `--tokens` / `--optimize-context` & MCP `openguild_profile_tokens`)**:
  - Automatically benchmarks AI rule token weight across all agent contract files (`AGENTS.md`, `.cursorrules`, `.gemini/rules.md`, `.openguild/team_memory.md`).
  - Achieves **80%–85% base prompt reduction** per chat turn (~770 tokens vs. ~4,500 token monolithic prompt baselines).
  - Calculates token economies, per-1,000 turn savings, and TTFT latency reductions.
  - Generates institutional Efficiency Grades (A+ through F).
- **Unified Deterministic Verification Gate (`lib/verifier.js`, `--verify [--fix]` & MCP `openguild_verify_invariants`)**:
  - Executes hermetic verification across 5 dimensions in a single step: automated tests, linter, typecheck, memory vault integrity, and `.gitignore` context hygiene.
  - Automatically applies `--fix` to repair memory duplicates and missing gitignore rules.
  - Emits certified markdown invariant proof badges for AI-driven development.
- **Deep Security & SAIF 2.0 Codebase Auditor (`lib/security_auditor.js`, `--audit` & MCP `openguild_audit_security`)**:
  - Scans workspace source files for leaked API keys, tokens, hardcoded passwords, unparameterized SQL concatenation, and raw `eval()` code execution hazards.
  - Assigns an institutional letter grade (A+ through F) with file-and-line remediation guidance.
- **MCP Expansion (10 Native Tools)**:
  - Added `openguild_profile_tokens`, `openguild_verify_invariants`, and `openguild_audit_security` to MCP tool registry.
- **New Test Suites**:
  - Added `tests/token_profiler.test.js` (token estimation, efficiency grades, workspace profiling).
  - Added `tests/verifier.test.js` (step execution, dry-runs, invariant pipeline).
  - Added `tests/security_auditor.test.js` (credential scanners, AST/regex hazard detectors, clean grade verification).
  - Total automated test suites expanded to 14 suites with 100% deterministic passage.

## [2.4.0] - 2026-09-04

### Added
- **16-Mind Supreme AGI Council Architecture**:
  - Expanded Council from 12 to 16 members to address autonomous, cognitive, and AGI systems engineering:
    - 🔮 **Chief Cognitive Analyst & Requirements Oracle** (`cognitive_analyst`): Latent requirement extraction, domain edge cases, and product anticipation.
    - 🔬 **Principal AGI & Cognitive Architecture Scientist** (`agi_scientist`): Multi-agent orchestration, neuro-symbolic reasoning, test-time compute scaling, and cognitive loops.
    - 🧬 **Autonomous Self-Healing & Evolution Specialist** (`self_healing`): Runtime fault recovery, self-correcting agent loops, and AST-based regression patching.
    - 📊 **High-Dimensional Knowledge & Vector Graph Architect** (`knowledge_graph`): Semantic ontology trees, persistent vector indexing, and hybrid graph-RAG.
- **Autonomous Auto-Analyst Engine (`lib/analyzer.js`, `--analyze` & MCP `openguild_auto_analyze`)**:
  - Automatically transforms raw, underspecified project concepts or existing codebases into exhaustive 16-Mind engineering blueprints.
  - Generates domain classification, anticipated edge cases, sovereign tech stack recommendations, UI/UX interaction plans, security safeguards, and invariant test contracts.
- **AGI Domain Preset (`--preset agi`)**:
  - Custom preset optimized for agent swarms, autonomous reflection loops, vector memory, and self-healing systems.
- **New Test Suite**: Added `tests/analyzer.test.js`.

## [2.3.0] - 2026-09-04

### Added
- **Autonomous Learning Engine (`lib/learn.js`, `--learn` & MCP `openguild_learn`)**:
  - Auto-captures takeaways, bugfix root causes, and architectural guidelines directly into memory.
  - Built-in SAIF secret scrubbing that automatically detects and redacts AWS keys, GitHub tokens, Bearer headers, and private keys.
  - Automatic category inference and tag indexing (`architecture`, `security`, `performance`, `bugfix`, `invariants`, `ui-ux`).
  - Intelligent deduplication engine preventing redundant memory rules.
- **Dialectical Council Debate Protocol in MCP (`openguild_consult_council`)**:
  - Adds `mode: 'debate'` simulating adversarial trade-off analysis between Architect, Performance, Security, and Product leads.
  - Adds `mode: 'audit'` focusing strictly on SAIF compliance and deterministic invariant verification.
- **1-Click CI/CD Council Reviewer Generator (`lib/ci.js`, `--setup-ci`)**:
  - Generates `.github/workflows/openguild-council-review.yml` for GitHub Actions.
  - Injects detected stack verification commands (`testCmd`, `lintCmd`, `typecheckCmd`) and verifies memory integrity on every PR.
- **New Test Suites**: Added `tests/learn.test.js` and `tests/ci.test.js`.

## [2.2.0] - 2026-08-31

### Added
- **Team-Synced Workspace Memory (`--team`)**:
  - Initializes a version-controlled `.openguild/` directory with `team_memory.md` and `architecture_decisions.md`.
  - Automatically loaded alongside personal global memory by AI editors and the MCP server.
- **1-Click MCP Editor Configurator (`--setup-mcp [editor]`)**:
  - Non-destructively detects and updates configuration files for Claude Desktop, Cursor IDE, and Antigravity.
- **Memory Vault Linter & Auto-Cleaner (`--lint-memory [--fix]`)**:
  - Audits memory files for duplicate bullet points, formatting irregularities, and empty rules.
  - Automatically deduplicates and cleans vaults with `--fix`.
- **New Test Suites**: Added `tests/editor_config.test.js`, `tests/memory_linter.test.js`, and `tests/team_memory.test.js`.

## [2.1.0] - 2026-08-31

### Added
- **12-Expert Council Architecture**: Expanded the council with three specialized roles:
  - ⚡ **Performance & Latency Specialist** (algorithmic complexity, caching, zero-copy, async I/O).
  - 🗄️ **Database Reliability Engineer** (ACID transactions, migration safety, query plans, indexing).
  - 💼 **Product & Domain Strategy Lead** (business logic fidelity, edge case mapping, preventing bloat).
- **Domain Preset Engine (`--preset <name>` / `-p <name>`)**:
  - `full` — Complete 12-expert council.
  - `backend` — Distributed systems, database reliability, performance, and API design.
  - `web` — Full-stack web, interface ergonomics, accessibility, and product logic.
  - `mobile` — Native & multiplatform mobile apps and client performance.
  - `ai-ml` — AI pipelines, data engineering, and safety guardrails.
- **Enhanced Interactive Wizard**: Preset selection integrated directly into interactive prompts.

## [2.0.0] - 2026-08-31

### Added
- **Native Model Context Protocol (MCP) Server (`npx antigravity-guild mcp`)**:
  - Full implementation of JSON-RPC 2.0 stdio transport (2024-11-05 protocol specification).
  - `openguild_read_memory`: Read any or all memory vault files in real time.
  - `openguild_write_memory`: Persist new lessons learned and rules directly from AI agent sessions.
  - `openguild_search_memory`: Search across all memory files by keyword.
  - `openguild_consult_council`: Structured Expert Council reviews during pair programming.
  - `openguild_get_project_context`: Dynamic workspace context and invariant inspection.
- **Interactive Configuration Wizard (`--interactive` / `-i`)**:
  - Interactive terminal prompts to configure custom test, lint, and typecheck commands.
  - Quick-add initial developer preferences directly into global memory.
- **Git Pre-Commit Invariant Hooks (`--install-hooks`)**:
  - Automatically installs `.git/hooks/pre-commit` script to enforce verification invariants before commits.
- **Cross-Device Memory Backup & Sync (`--export-memory`, `--import-memory`)**:
  - Portable JSON export and intelligent merge for team collaboration and multi-machine sync.

## [1.1.0] - 2026-08-31

### Added
- **Modular Core Architecture (`lib/`)**: Refactored into clean modules (`constants.js`, `detectors.js`, `memory.js`, `generator.js`, `gitignore.js`).
- **Expanded Ecosystem Detection**:
  - Monorepos: Turborepo (`turbo.json`), Nx (`nx.json`), pnpm workspaces, and Cargo workspaces.
  - Mobile & Apple: Flutter/Dart (`pubspec.yaml`), Swift / SwiftUI (`Package.swift`, `.xcodeproj`).
  - Additional Languages: C/C++ (`CMakeLists.txt`, `Makefile`), PHP (`composer.json`, Laravel, Symfony).
  - Modern Web: Astro, Remix, Angular, Bun lockfiles (`bun.lock`).
- **Interactive Memory Dashboard (`--status` / `-s`)**: Inspect active memory documents, file sizes, modification timestamps, and Council registry.
- **Dry-Run Mode (`--dry-run` / `-d`)**: Preview stack detection and generated contracts without writing to disk.
- **Constitutional & SAIF Safeguards**: Explicit destructive action confirmation gates and secret scrubbing invariants injected into AI rules.
- **Non-Destructive Merging**: Preserves existing custom developer rules when regenerating workspace rule files.

## [1.0.0] - 2026-08-31

### Added
- **Global Persistent Memory Hub** (`~/.openguild/memory/`) — stores developer preferences, institutional lessons, and security standards across all projects.
- **Auto stack detection** for JavaScript, TypeScript, Python, Rust, Go, C#/.NET, and Java/Kotlin projects.
- **Framework detection** for Next.js, React, Vue, Svelte, SvelteKit, Nuxt, Express, Fastify, Hono, NestJS, Django, FastAPI, and Flask.
- **Package manager detection** for npm, yarn, pnpm, bun, pip, poetry, uv, cargo, go, dotnet, maven, and gradle.
- **AI agent rule generation** for Antigravity IDE (`.gemini/rules.md`), Cursor (`.cursorrules`), and the universal agent standard (`AGENTS.md`).
- **Context hygiene** — automatic `.gitignore` enforcement for secrets and heavy directories.
- **Zero dependencies** — pure Node.js, no external packages.
