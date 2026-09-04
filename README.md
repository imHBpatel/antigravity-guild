# ⚡ OpenGuild (`antigravity-guild`)

> **Turn your AI coding assistant into a 16-person staff engineering team that never forgets a bug, never leaks a secret, and saves thousands of tokens on every chat turn.**

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg?style=flat-square)](package.json)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0%20(Pure%20Node.js)-success.svg?style=flat-square)](package.json)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg?style=flat-square)](README.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)

Run one command in any project:

```bash
npx antigravity-guild
```
*(or `npx openguild`)*

Works out-of-the-box with **Antigravity IDE**, **Cursor**, **Claude Desktop**, **VS Code**, **Windsurf**, and **Gemini**.

---

## 😫 The Problem with AI Assistants Today

If you use Cursor, Claude, or Antigravity to write code every day, you know these frustrations:

1. **AI Amnesia:** You spend 30 minutes teaching your AI not to use `any` in TypeScript or how your auth middleware works. The next day, in a new chat, it makes the exact same mistake.
2. **Context Bloat & Sluggish Responses:** Huge system prompts burn 4,000+ tokens before you even type your prompt. Responses feel slow, cost real API dollars, and the AI suffers from *attention drift*.
3. **Shallow, Junior Code:** Most AI code works for a demo, but collapses in production: missing null checks, zero error handling, unparameterized SQL queries, and sloppy architecture.
4. **Zero Team Alignment:** Everyone on your team prompts their AI differently, resulting in mismatched styles, broken conventions, and conflicting PRs.

### ✨ How OpenGuild Fixes This

| Without OpenGuild | With OpenGuild v2.5.0 |
|:---|:---|
| AI forgets project lessons every time you open a new chat | **Cross-project memory vault** remembers every architectural rule and bugfix forever |
| 4,500+ tokens burned on monolithic rules per turn | **Lean 770-token base contract** (80-85% token diet) with instant sub-second streaming |
| AI generates naive code without thinking about edge cases | **16-Mind Council** applies Google scalability, Apple UX aesthetics, and Anthropic safety |
| AI commits broken code and forgets tests | **Deterministic Verification Gate** blocks completion until tests and linters pass |
| Secrets, API keys, and raw `eval()` leak into code | **Built-in SAIF 2.0 Security Auditor** catches credentials and hazards before you commit |

---

## ⚡ Quick Start in 60 Seconds

You don't need to install anything globally or create an account. OpenGuild runs directly via `npx` with **zero external dependencies**.

### Step 1: Initialize your project
Open your terminal, navigate to your project, and run:

```bash
cd your-awesome-project
npx antigravity-guild
```

OpenGuild automatically detects your stack (Next.js, FastAPI, Rust Axum, Go, Flutter, etc.) and synthesizes non-destructive rule contracts:
- `AGENTS.md` (Universal Agent standard)
- `.cursorrules` (Cursor IDE)
- `.gemini/rules.md` (Antigravity & Gemini)
- `~/.openguild/memory` (Your global, cross-project memory vault)

---

### Step 2: Connect your AI editor (1-Click)
Run this command to automatically register OpenGuild's native MCP server in your editor's configuration:

```bash
# Auto-configures Cursor, Claude Desktop, and Antigravity IDE
npx antigravity-guild --setup-mcp all
```

*Prefer a specific editor? Use `npx antigravity-guild --setup-mcp cursor` or `claude`.*

---

### Step 3: Chat with your AI normally
Open your editor and prompt your assistant. You will instantly notice the difference. Your AI now has deep memory, high standards, and 10 real-time tools.

---

## 🛠️ The 6 Core Superpowers

### 1. 🧠 Persistent Memory That Actually Learns
Never repeat yourself to an AI again. Whenever you solve a tricky bug or decide on an architectural rule, teach OpenGuild:

```bash
# Save an insight to your global memory (available across all your projects)
npx antigravity-guild --learn "Always set Content-Type header on custom fetch calls" --category architecture

# Or teach it directly inside your chat with Cursor or Claude:
# "Remember: We always use zod to parse inbound request bodies in this project."
```

OpenGuild automatically scrubs API keys and secrets before saving, indexes the lesson with tags, and deduplicates redundant rules.

---

### 2. ⚡ Context Diet & Token Profiler (`--tokens`)
Monolithic prompts slow down your AI and cost money. OpenGuild keeps base instructions razor-thin (~770 tokens) and pulls deep knowledge only when needed via MCP tools.

Run the profiler anytime to see your token weight and savings:

```bash
npx antigravity-guild --tokens
```

**Example Output:**
```text
# ⚡ OpenGuild Token & Context Diet Report
Efficiency Grade: A+ (🟢 Highly Optimized)
  Active Context Token Load:  771 tokens
  Standard Monolithic Prompt: 4,500 tokens
  Context Diet Savings:       83% reduction (~3,729 tokens saved/turn)
  Estimated Cost Savings:     ~$11.19 per 1,000 chat turns
```

---

### 3. 🔮 Autonomous Auto-Analyst (`--analyze`)
Have a rough idea but aren't sure how to architect it? The Auto-Analyst turns raw concepts into full production-grade blueprints in seconds:

```bash
npx antigravity-guild --analyze "A self-hosted bookmark manager with AI auto-tagging and offline search"
```

**What it generates:**
- Inferred problem domain and target personas
- Latent edge cases and failure modes you didn't think of
- Recommended tech stack (Frontend, Backend, Database, AI models)
- Apple-grade UI/UX specifications and micro-interactions
- Security guardrails and deterministic test contracts

---

### 4. 🧪 Deterministic Verification Gate (`--verify`)
Stop trusting an AI that says *"Everything is done and working!"* when tests are failing. Run OpenGuild's unified invariant gate:

```bash
# Verify tests, linter, types, memory integrity, and git hygiene in one command
npx antigravity-guild --verify

# Auto-fix memory duplicates and missing .gitignore rules
npx antigravity-guild --verify --fix
```

It executes your project's native test commands (`npm test`, `pytest`, `cargo test`, `go test`) and outputs a certified invariant proof.

---

### 5. 🛡️ Deep Security & SAIF 2.0 Codebase Auditor (`--audit`)
Scan your repository for secret leaks, hardcoded credentials, and high-risk code patterns before pushing to production:

```bash
npx antigravity-guild --audit
```

**What it catches:**
- Plaintext API keys, AWS credentials, GitHub tokens, and private keys
- Uncommitted sensitive `.env` files
- Dynamic SQL string concatenation (SQL injection hazards)
- Arbitrary code execution hazards (`eval()`)

Assigns an institutional grade (**A+ to F**) with exact filenames, line numbers, and fix instructions.

---

### 6. 👥 Git-Shared Team Memory (`--team`)
Ensure every developer on your team gets the exact same high-quality AI output:

```bash
npx antigravity-guild --team
```

Creates a version-controlled `.openguild/` folder containing `team_memory.md` and `architecture_decisions.md`. When teammates pull the repo, their AI assistants automatically inherit all team decisions.

---

## 💡 The Prompt Playbook (Copy & Paste Into Your Chat)

Once OpenGuild is set up, you don't need complex prompting. Copy and paste these **battle-tested prompts** into Cursor, Claude, or Antigravity:

### 🚀 1. Before Starting a New Feature (System Design)
> *"Act as the Chief Software Architect and 16-Mind Council. Review this feature request: [Describe Feature]. Design the data model, API contracts, edge cases, and component boundaries before writing any code."*

### 🎨 2. Polishing UI & User Experience (Apple Standard)
> *"Review this screen through the lens of the Apple CTO and UI/UX Lead. Make typography, responsive layout, spacing, accessible contrast, and micro-interactions feel clean, premium, and intuitive."*

### ⚡ 3. Optimizing Slow Code or Database Queries
> *"Have the Performance Specialist and Database Reliability Engineer review our queries, caching, and state management. Identify any N+1 query patterns, memory leaks, or unindexed lookups."*

### 🛡️ 4. Security & Bug Audit (Before Submitting PR)
> *"Act as the Chief Security Officer and QA Lead. Audit this code for unhandled null/undefined values, secret leakage, unparameterized queries, and race conditions."*

### 🧪 5. Deterministic Verification Gate
> *"Run our automated test suite and typechecks using the openguild_verify_invariants tool. Do not mark this task as complete until all tests pass deterministically."*

---

## 🏛️ The 16-Mind Supreme Council

OpenGuild models its engineering guidelines after 16 specialized roles. Each mind focuses on a critical pillar of production software:

```mermaid
graph TD
    User([Developer / User]) --> OpenGuild[OpenGuild Unified Brain]
    OpenGuild --> Core[Core Engineering]
    OpenGuild --> BigTech[Big Tech CTO Minds]
    OpenGuild --> Specialists[Deep Domain Specialists]
    OpenGuild --> AGI[Autonomous & AGI Systems]

    Core --> Arch["🧠 Chief Software Architect"]
    Core --> UI["🎨 Principal UI/UX Lead"]
    Core --> Sec["🛡️ Chief Security Officer"]
    Core --> Eng["⚡ Staff Full-Stack Engineer"]
    Core --> QA["🧪 Principal QA Lead"]
    Core --> DevOps["🚀 DevOps Engineer"]

    BigTech --> Google["🌐 Google CTO Brain (Scalability)"]
    BigTech --> Apple["🍎 Apple CTO Brain (Aesthetics)"]
    BigTech --> Anthropic["🧭 Anthropic Safety Brain (Alignment)"]

    Specialists --> Perf["⚡ Performance Specialist (O(n), Caching)"]
    Specialists --> DB["🗄️ Database Reliability Engineer (ACID)"]
    Specialists --> Prod["💼 Product Strategy Lead (Anti-Bloat)"]

    AGI --> Cog["🔮 Chief Cognitive Analyst (Latent Edge Cases)"]
    AGI --> Sci["🔬 Principal AGI Scientist (Cognitive Loops)"]
    AGI --> Heal["🧬 Self-Healing Specialist (Fault Recovery)"]
    AGI --> Graph["📊 Knowledge Graph Architect (Vector & RAG)"]
```

---

## 🌐 Model Context Protocol (MCP) Server

OpenGuild exposes **10 native MCP tools** that give AI assistants live superpowers inside your editor:

| MCP Tool | What It Does for the AI |
|:---|:---|
| `openguild_auto_analyze` | Auto-analyzes product visions and codebases to generate complete engineering blueprints |
| `openguild_profile_tokens` | Checks AI rule token weight, efficiency scores, and context savings |
| `openguild_verify_invariants` | Runs hermetic verification across tests, linters, types, memory, and git hygiene |
| `openguild_audit_security` | Scans files for exposed API credentials, SQL injection, and code hazards |
| `openguild_read_memory` | Retrieves architectural rules, user preferences, and past bugfixes |
| `openguild_write_memory` | Saves new engineering standards or decisions directly from the chat session |
| `openguild_learn` | Self-reflects on errors, records lessons, and automatically scrubs secrets |
| `openguild_search_memory` | Searches memory archives using keywords (e.g., `"jwt"`, `"timeout"`, `"rate-limit"`) |
| `openguild_consult_council` | Queries the 16-Mind Council in `debate`, `audit`, or `consensus` mode |
| `openguild_get_project_context` | Inspects detected tech stack, test commands, and invariant rules |

---

## ⚙️ Complete CLI Cheat Sheet

| Command / Flag | Purpose | Example |
|:---|:---|:---|
| `npx antigravity-guild` | Initialize or update OpenGuild in current project | `npx antigravity-guild` |
| `npx antigravity-guild --preset <name>` | Use a targeted preset (`full`, `agi`, `backend`, `web`, `mobile`, `ai-ml`) | `npx antigravity-guild --preset backend` |
| `npx antigravity-guild --setup-mcp [editor]` | 1-Click configure MCP for `cursor`, `claude`, `antigravity`, or `all` | `npx antigravity-guild --setup-mcp all` |
| `npx antigravity-guild --tokens` | Benchmark context token consumption and cost savings | `npx antigravity-guild --tokens` |
| `npx antigravity-guild --verify [--fix]` | Run unified tests, lint, typecheck, and memory check | `npx antigravity-guild --verify --fix` |
| `npx antigravity-guild --audit` | Scan project for secret leaks and code vulnerabilities | `npx antigravity-guild --audit` |
| `npx antigravity-guild --analyze "<idea>"` | Auto-generate comprehensive architecture blueprint | `npx antigravity-guild --analyze "Real-time sync engine"` |
| `npx antigravity-guild --learn "<insight>"` | Record an engineering lesson with secret scrubbing | `npx antigravity-guild --learn "Use redis locks for queue jobs"` |
| `npx antigravity-guild --team` | Initialize Git-shared team memory in `.openguild/` | `npx antigravity-guild --team` |
| `npx antigravity-guild --setup-ci` | Generate GitHub Actions Council Review workflow | `npx antigravity-guild --setup-ci` |
| `npx antigravity-guild --lint-memory [--fix]` | Clean duplicate rules and format memory vault | `npx antigravity-guild --lint-memory --fix` |
| `npx antigravity-guild --status` | Inspect active memory files, council status, and stats | `npx antigravity-guild --status` |
| `npx antigravity-guild --export-memory` | Backup memory vault to JSON file | `npx antigravity-guild --export-memory backup.json` |
| `npx antigravity-guild --import-memory <file>`| Restore or merge memory vault from JSON backup | `npx antigravity-guild --import-memory backup.json` |
| `npx antigravity-guild --install-hooks` | Install Git pre-commit invariant verification hook | `npx antigravity-guild --install-hooks` |
| `npx antigravity-guild --dry-run` | Preview actions without modifying disk | `npx antigravity-guild --dry-run` |

---

## 🔒 Privacy, Security & Zero-Dependency Guarantee

- **100% Pure Node.js Built-ins:** Requires zero npm dependencies. No bloated node_modules trees, no supply chain vulnerabilities.
- **Runs Exclusively on Your Machine:** Never sends your code, prompts, memory, or metadata to external servers or third-party cloud APIs.
- **Automated Secret Scrubbing:** Automatically detects and strips API keys, OAuth tokens, and private keys before anything touches memory.
- **Safe, Non-Destructive Merging:** Never blindly overwrites existing `.cursorrules` or configuration files; intelligently merges rules while preserving your custom instructions.

---

## ❓ Frequently Asked Questions (FAQ)

### Does OpenGuild slow down my editor or chat?
**No, it speeds it up.** Traditional prompt templates dump thousands of lines into the base context, causing slow responses and attention drift. OpenGuild uses an ultra-lean base contract (~770 tokens) and lets the AI query deeper memory via lightweight MCP tools only when needed.

### Where is my global memory stored?
Global memory lives in `~/.openguild/memory/` on your machine (`C:\Users\<User>\.openguild\memory` on Windows). It is organized into clean markdown files (`institutional_memory.md`, `security_standards.md`, `user_profile.md`) that you can inspect and edit anytime.

### How do I share memory with my teammates?
Run `npx antigravity-guild --team`. This creates a `.openguild/` folder inside your repository. Commit this folder to Git. Any teammate who pulls the repository will automatically share project architecture decisions and team standards.

### Can I use OpenGuild with existing projects?
**Yes.** OpenGuild was designed specifically for existing, mature codebases. It automatically detects your package manager, test scripts, and directory layout without breaking existing workflows.

---

## 📄 License

MIT © [Hardik Patel](https://github.com/imHBpatel)