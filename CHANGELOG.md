# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
