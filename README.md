# ⚡ OpenGuild

**Zero-config persistent memory and multi-role AI expert guild for Antigravity IDE, Cursor, and Claude.**

Run one command. Get an AI coding assistant that thinks like a council of 9 world-class engineers — across every project, every language, every editor.

```bash
npx antigravity-guild
```

---

## Why OpenGuild?

AI coding assistants are powerful, but they start every session with a blank slate. They don't remember your preferences, your security standards, or the lessons you've learned across projects. They don't have a framework for engineering excellence — they just autocomplete.

**OpenGuild solves this.** It gives your AI assistant:

- 🧠 **Persistent memory** that follows you across every project
- 👥 **A 9-expert council** that reviews every decision through the lens of architecture, security, UX, testing, scalability, and safety
- 🔧 **Auto-detected tooling** so the AI knows your exact stack, test runner, and linter — zero configuration needed

The result: your AI stops behaving like a junior autocomplete engine and starts behaving like a senior engineering team.

---

## Quick Start

### 1. Navigate to any project

```bash
cd your-project
```

### 2. Run OpenGuild

```bash
npx antigravity-guild
```

That's it. Your project is now configured.

### 3. Open your AI editor and prompt

Open the project in **Antigravity IDE**, **Cursor**, or any Claude-powered editor. The AI will automatically load the generated rules and start operating as the 9-Expert Council.

---

## What It Does

When you run `npx antigravity-guild` inside a project, four things happen:

### 1. Global Memory Hub

Creates `~/.openguild/memory/` — a persistent knowledge base that survives across projects:

| File | Purpose |
|------|---------|
| `user_profile.md` | Your coding preferences and standards |
| `institutional_memory.md` | Hard-won lessons and patterns to always follow |
| `security_standards.md` | Security contract — secrets, input sanitization, access control |
| `council_registry.md` | The 9-Expert Council role definitions |

> Edit these files to teach your AI how *you* work. Changes apply to every project automatically.

### 2. Stack Detection

Automatically detects your language, framework, package manager, and configures the correct commands:

| Language | Frameworks | Package Managers |
|----------|-----------|-----------------|
| TypeScript / JavaScript | Next.js, React, Vue, Svelte, SvelteKit, Nuxt, Express, Fastify, Hono, NestJS | npm, yarn, pnpm, bun |
| Python | Django, FastAPI, Flask | pip, poetry, uv |
| Rust | — | cargo |
| Go | — | go |
| C# / .NET | — | dotnet |
| Java / Kotlin | Spring Boot | maven, gradle |

### 3. AI Agent Rules

Generates three rule files — one for each major AI editor:

| File | Editor |
|------|--------|
| `.gemini/rules.md` | Antigravity IDE (Gemini) |
| `AGENTS.md` | Universal agent standard |
| `.cursorrules` | Cursor IDE |

These files instruct the AI to operate as the **9-Expert Council** and run your test suite, linter, and typechecker before marking any task as complete.

### 4. Context Hygiene

Updates `.gitignore` to exclude heavy directories (`node_modules/`, `dist/`, `.next/`) and sensitive files (`.env`, `.key`, `.pem`) — keeping your AI's context window clean and secure.

---

## The 9-Expert Council

Every decision your AI makes is reviewed through nine expert perspectives:

| # | Role | Responsibility |
|---|------|---------------|
| 1 | 🧠 Chief Software Architect | System design, database normalization, scalable patterns |
| 2 | 🎨 Principal UI/UX Lead | Responsive design, accessibility, micro-interactions |
| 3 | 🛡️ Chief Security Officer | SAIF compliance, auth validation, secret scrubbing |
| 4 | ⚡ Staff Full-Stack Engineer | Modular, idiomatic, production-grade code |
| 5 | 🧪 Principal QA Lead | Automated test suites, zero-regression proofs |
| 6 | 🚀 DevOps Engineer | Hermetic builds, CI pipelines, deployment readiness |
| 7 | 🌐 Google CTO Brain | Internet-scale architecture, AI-first design, world-class innovation |
| 8 | 🍎 Apple CTO Brain | Uncompromising product excellence, magical UX, premium aesthetics |
| 9 | 🧭 Anthropic Safety Brain | Safety-first engineering, explainable code, user-intent alignment |

> **For non-technical users:** This means your AI doesn't just write code that works — it writes code that's secure, beautiful, tested, scalable, and safe. You get the combined engineering standards of Google, Apple, and Anthropic applied to every line.

---

## CLI Reference

```
USAGE
  $ npx antigravity-guild [options]

OPTIONS
  -h, --help      Show help message
  -v, --version   Print version number
      --reset     Clear and re-initialize global memory
```

### Examples

```bash
# Set up a new project
mkdir my-app && cd my-app && npm init -y
npx antigravity-guild

# Set up an existing project
cd existing-project
npx antigravity-guild

# Re-initialize global memory (fresh start)
npx antigravity-guild --reset
```

---

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                    npx antigravity-guild                  │
└──────────────────────┬───────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌──────────┐ ┌───────────┐ ┌──────────┐
   │ Global   │ │   Stack   │ │ Context  │
   │ Memory   │ │ Detection │ │ Hygiene  │
   │ Hub      │ │           │ │          │
   └────┬─────┘ └─────┬─────┘ └────┬─────┘
        │              │            │
        └──────────────┼────────────┘
                       ▼
              ┌────────────────┐
              │ AI Agent Rules │
              │                │
              │ .gemini/       │
              │ AGENTS.md      │
              │ .cursorrules   │
              └────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Your AI IDE   │
              │  reads rules   │
              │  and operates  │
              │  as the 9-     │
              │  Expert Council│
              └────────────────┘
```

---

## Customizing Your Memory

The global memory files at `~/.openguild/memory/` are plain Markdown. Edit them to teach the AI your standards:

```bash
# Open your global memory
code ~/.openguild/memory/
```

**Examples of things to add:**

In `user_profile.md`:
```markdown
- I prefer functional programming patterns over OOP.
- Always use early returns instead of deeply nested conditionals.
- Use descriptive variable names — never abbreviate.
```

In `institutional_memory.md`:
```markdown
- Our API rate limits are 1000 req/min — always implement exponential backoff.
- The legacy auth service returns 200 even on failures. Check the response body.
```

In `security_standards.md`:
```markdown
- All user input must be sanitized before database queries.
- Never store passwords in plaintext — use bcrypt with 12+ rounds.
```

---

## FAQ

### Does this require any dependencies?

No. OpenGuild is a single-file CLI with **zero dependencies** — just Node.js.

### Does this modify my source code?

No. It only creates configuration files (`.gemini/rules.md`, `AGENTS.md`, `.cursorrules`) and updates `.gitignore`. Your source code is never touched.

### What Node.js version do I need?

Node.js 16 or later.

### Can I use this with editors other than Antigravity and Cursor?

Yes. The `AGENTS.md` file follows the universal agent standard and works with any AI assistant that reads project-level instruction files (Claude, GitHub Copilot, etc.).

### How do I reset everything?

```bash
npx antigravity-guild --reset
```

This clears your global memory and re-initializes it with defaults.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) © Hardik Patel