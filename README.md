# ⚡ OpenGuild (`antigravity-guild`) v2.2.0

**Zero-config persistent memory, 12-Expert AI Council, Domain Presets, 1-Click MCP Editor Setup, and Team-Synced Memory for Antigravity IDE, Cursor, Gemini, and Claude.**

Run one command. Give your AI coding assistant the engineering standards of Google, Apple, and Anthropic — across every project, language, monorepo, and editor.

```bash
npx antigravity-guild
```
*(or `npx openguild`)*

---

## 💡 The Prompt Playbook (How Anyone Can Build World-Class Software)

Once you run OpenGuild, you don't need complex prompt engineering. Use these **5 copy-paste prompts** in **Antigravity IDE**, **Cursor**, **Gemini**, or **Claude**:

### 1. 🏗️ Architecture & System Design (Before writing code)
> *"I want to build [Feature Description]. Before writing code, have the 12-Expert Council design the data model, API contracts, and security boundaries."*

### 2. 🎨 Apple-Grade UI/UX & Polish
> *"Review this screen through the lens of the Apple CTO and UI/UX Lead. Make typography, responsive layout, spacing, and micro-interactions feel clean, accessible, and intuitive."*

### 3. 🛡️ Security & Bug Audit (Before deploying)
> *"Act as the Chief Security Officer and QA Lead. Audit this code for hidden bugs, unhandled null checks, secret leakage, or input vulnerabilities."*

### 4. ⚡ Performance & Database Optimization
> *"Have the Performance Specialist and Database Reliability Engineer review our queries, caching, and state management for performance bottlenecks or slow queries."*

### 5. 🧪 Deterministic Verification Proof
> *"Run our automated test suite and typechecks. Do not mark this task as complete until all tests pass with zero errors."*

---

## 🌟 What's New in v2.2.0

- 👥 **Team-Synced Workspace Memory (`--team`)**: Initializes a Git-versioned `.openguild/` directory with `team_memory.md` and `architecture_decisions.md` so the entire engineering team shares context automatically.
- ⚡ **1-Click MCP Editor Configurator (`--setup-mcp [editor]`)**: Instantly detects and injects the OpenGuild MCP server into **Claude Desktop**, **Cursor IDE**, and **Antigravity** config files without manual JSON editing.
- 🧹 **Memory Vault Linter & Auto-Cleaner (`--lint-memory [--fix]`)**: Scans and deduplicates memory bullet points, removes stale rules, and optimizes context size.
- 🏛️ **12-Expert Council Architecture**: Features Architect, UI/UX, Security, Staff Eng, QA, DevOps, Google CTO, Apple CTO, Anthropic Safety, Performance Specialist, Database Reliability Engineer, and Product Strategy Lead.
- 🎯 **Domain Preset Engine (`--preset <name>`)**: Instantly tailor your AI Council's focus (`full`, `backend`, `web`, `mobile`, `ai-ml`).

---

## 🚀 Quick Start

### 1. Configure any workspace
```bash
cd your-project

# Standard setup
npx antigravity-guild

# With domain preset (e.g. backend)
npx antigravity-guild --preset backend

# Initialize Git-shared team memory
npx antigravity-guild --team
```

### 2. 1-Click Connect Your AI Editors
```bash
# Auto-configure Claude Desktop, Cursor, and Antigravity
npx antigravity-guild --setup-mcp all
```

### 3. Inspect your memory vault & Council status
```bash
npx antigravity-guild --status
```

---

## 🌐 Model Context Protocol (MCP) Server

OpenGuild v2.2.0 includes a built-in MCP server that gives AI assistants live tools to **read, write, search, and recall memory**, and **consult the 12-Expert Council** in real time.

### 🛠️ Exposed MCP Tools:

| MCP Tool | Description |
| :--- | :--- |
| **`openguild_read_memory`** | Read lessons, standards, or user preferences from global & team memory vaults |
| **`openguild_write_memory`** | Save new lessons, architecture decisions, or security rules directly from chat |
| **`openguild_search_memory`** | Search all stored memory files for keywords (e.g. "rate limits", "auth", "tokens") |
| **`openguild_consult_council`** | Query the 12-Expert Council for multi-perspective architecture and code review |
| **`openguild_get_project_context`** | Retrieve detected stack invariants, verification commands, and AI contracts |

---

## 🏛️ The 12-Expert Council

| # | Role | Domain & Responsibility |
|---|------|------------------------|
| 1 | 🧠 **Chief Software Architect** | Domain modeling, data normalization, clean boundaries & scalability |
| 2 | 🎨 **Principal UI/UX Lead** | Responsive design, accessibility, micro-interactions & aesthetics |
| 3 | 🛡️ **Chief Security Officer** | SAIF compliance, auth validation, secret scrubbing & least-privilege |
| 4 | ⚡ **Staff Full-Stack Engineer** | Modular, idiomatic, clean zero-bloat production code |
| 5 | 🧪 **Principal QA Lead** | Automated test suites, edge case verification & zero-regression proofs |
| 6 | 🚀 **DevOps Engineer** | Hermetic builds, CI pipelines & reproducible environments |
| 7 | 🌐 **Google CTO Brain** | Internet-scale architecture, extreme scalability & AI-first design |
| 8 | 🍎 **Apple CTO Brain** | Uncompromising product excellence, magical UX & premium aesthetics |
| 9 | 🧭 **Anthropic Safety Brain** | Constitutional safeguards, explainability & user-intent alignment |
| 10 | ⚡ **Performance Specialist** | Algorithmic complexity (O(n)), zero-copy caching, memory layout & async I/O |
| 11 | 🗄️ **Database Reliability Engineer** | ACID guarantees, schema migration safety, query execution plans & indexing |
| 12 | 💼 **Product Strategy Lead** | Business logic edge cases, user story fidelity & preventing feature bloat |

---

## ⚙️ CLI Reference

```text
USAGE
  $ npx antigravity-guild [command] [options]

COMMANDS
  mcp                  Start the Model Context Protocol (MCP) server over stdio
  --setup-mcp [editor] 1-Click configure MCP for claude, cursor, antigravity, or all
  --team               Initialize Git-versioned workspace team memory (.openguild/)
  --lint-memory [--fix]Audit and clean memory vault for duplicate rules and bloat
  -i, --interactive    Launch step-by-step interactive configuration wizard
  --install-hooks      Install Git pre-commit invariant verification hook
  --export-memory [f]  Export global memory vault to portable JSON backup
  --import-memory <f>  Import and merge JSON memory archive into global vault

OPTIONS
  -p, --preset <name>  Apply domain preset (full, backend, web, mobile, ai-ml)
  -h, --help           Show this help message
  -v, --version        Print the version number
  -s, --status         Inspect global memory hub and active council status
  -d, --dry-run        Preview detected stack and generated contracts without writing
      --reset          Clear and re-initialize global memory hub
```

---

## 🧪 Verification & Determinism

```bash
npm test
```

Tested continuously across **Ubuntu, macOS, and Windows** on Node.js 18, 20, 22, and 24.

---

## 📄 License

[MIT](LICENSE) © Hardik Patel