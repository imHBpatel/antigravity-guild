# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-31

### Added

- **Global Persistent Memory Hub** (`~/.openguild/memory/`) — stores developer preferences, institutional lessons, and security standards across all projects.
- **9-Expert Council** — AI agent rule system with Architect, UI/UX Lead, Security Officer, Staff Engineer, QA Lead, DevOps, Google CTO Brain, Apple CTO Brain, and Anthropic Safety Brain.
- **Auto stack detection** for JavaScript, TypeScript, Python, Rust, Go, C#/.NET, and Java/Kotlin projects.
- **Framework detection** for Next.js, React, Vue, Svelte, SvelteKit, Nuxt, Express, Fastify, Hono, NestJS, Django, FastAPI, and Flask.
- **Package manager detection** for npm, yarn, pnpm, bun, pip, poetry, uv, cargo, go, dotnet, maven, and gradle.
- **AI agent rule generation** for Antigravity IDE (`.gemini/rules.md`), Cursor (`.cursorrules`), and the universal agent standard (`AGENTS.md`).
- **Context hygiene** — automatic `.gitignore` enforcement for secrets and heavy directories.
- **CLI flags**: `--help`, `--version`, `--reset`.
- **Zero dependencies** — pure Node.js, no external packages.
