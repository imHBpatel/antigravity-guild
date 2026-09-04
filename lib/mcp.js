'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { VERSION, TOOL_NAME, COUNCIL_MEMBERS } = require('./constants');
const { getGlobalMemoryPath, initMemoryHub } = require('./memory');
const { detectStack } = require('./detectors');
const { buildRuleContent } = require('./generator');
const { recordLesson } = require('./learn');
const { autoAnalyze } = require('./analyzer');
const { profileTokens } = require('./token_profiler');
const { verifyProject } = require('./verifier');
const { auditSecurity } = require('./security_auditor');

/**
 * Model Context Protocol (MCP) Tool Definitions (2024-11-05 spec)
 */
const MCP_TOOLS = [
  {
    name: 'openguild_read_memory',
    description: 'Read persistent knowledge, engineering lessons, security standards, or developer preferences from the OpenGuild global & team memory vaults.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Optional specific memory file (e.g. "institutional_memory.md", "team_memory.md", "architecture_decisions.md", "security_standards.md", "user_profile.md"). Omit to read all memory files.',
        },
      },
    },
  },
  {
    name: 'openguild_write_memory',
    description: 'Persist a new lesson learned, architecture decision, security rule, or developer preference into the OpenGuild memory vault.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Target memory file (e.g. "institutional_memory.md", "team_memory.md", "architecture_decisions.md", "user_profile.md").',
        },
        content: {
          type: 'string',
          description: 'The markdown text to append or write.',
        },
        scope: {
          type: 'string',
          enum: ['global', 'team'],
          description: 'Whether to write to global memory (~/.openguild/memory) or workspace team memory (.openguild). Default: global.',
          default: 'global',
        },
        mode: {
          type: 'string',
          enum: ['append', 'overwrite'],
          description: 'Whether to append (default) or overwrite the file.',
          default: 'append',
        },
      },
      required: ['file', 'content'],
    },
  },
  {
    name: 'openguild_learn',
    description: 'Self-reflect and persist an engineering takeaway, post-bugfix root cause, or architecture pattern into OpenGuild memory with automated secret scrubbing.',
    inputSchema: {
      type: 'object',
      properties: {
        insight: {
          type: 'string',
          description: 'The lesson, bugfix root cause, or architecture pattern learned.',
        },
        category: {
          type: 'string',
          enum: ['architecture', 'security', 'performance', 'bugfix', 'invariants', 'ui-ux', 'general'],
          description: 'Optional categorization. If omitted, automatically inferred from content.',
        },
        scope: {
          type: 'string',
          enum: ['global', 'team'],
          description: 'Whether to write to global memory (~/.openguild/memory) or workspace team memory (.openguild). Default: global.',
          default: 'global',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for categorization (e.g. ["postgres", "indexing"]).',
        },
      },
      required: ['insight'],
    },
  },
  {
    name: 'openguild_search_memory',
    description: 'Search across all global and team memory files for specific keywords (e.g. "rate limit", "auth", "tokens", "migrations").',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The keyword or phrase to search for in memory vault documents.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'openguild_consult_council',
    description: 'Consult the 12-Expert Council on an engineering question, code review, performance optimization, dialectical debate, or system design.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The question, architecture decision, or code diff to review.',
        },
        mode: {
          type: 'string',
          enum: ['consensus', 'debate', 'audit'],
          description: 'Deliberation mode: "consensus" for comprehensive synthesis, "debate" for explicit tension/trade-off analysis, or "audit" for strict security/QA checks. Default: consensus.',
          default: 'consensus',
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional subset of expert IDs to consult (e.g. ["security", "architect", "performance", "database"]). Omit to consult the entire Council.',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'openguild_get_project_context',
    description: 'Get auto-detected tech stack, verification invariants (test, lint, typecheck commands), and active AI contracts for a given project directory.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Directory path of the project. Defaults to current working directory if omitted.',
        },
      },
    },
  },
  {
    name: 'openguild_auto_analyze',
    description: 'Auto-analyze an underspecified product vision or existing workspace and synthesize a complete 16-Mind engineering blueprint (stack, edge cases, data schema, UI/UX, security, and test invariants).',
    inputSchema: {
      type: 'object',
      properties: {
        vision: {
          type: 'string',
          description: 'A product concept, user request, or feature idea to auto-analyze and architect.',
        },
        projectPath: {
          type: 'string',
          description: 'Optional local project directory to analyze instead of a vision statement.',
        },
      },
    },
  },
  {
    name: 'openguild_profile_tokens',
    description: 'Profile token consumption, calculate context efficiency grade, and measure token savings per turn across project AI rule contracts.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Directory path of the project. Defaults to current working directory.',
        },
      },
    },
  },
  {
    name: 'openguild_verify_invariants',
    description: 'Run unified deterministic verification proof across automated tests, linter, typecheck, memory vault integrity, and gitignore hygiene.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Directory path of the project. Defaults to current working directory.',
        },
        autoFix: {
          type: 'boolean',
          description: 'Whether to auto-fix memory and context hygiene issues. Default: false.',
          default: false,
        },
      },
    },
  },
  {
    name: 'openguild_audit_security',
    description: 'Perform a comprehensive SAIF 2.0 security audit across the codebase for plaintext credentials, secret tokens, code execution vulnerabilities, and context leaks.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Directory path of the project. Defaults to current working directory.',
        },
      },
    },
  },
];

/**
 * Handle MCP Tool Invocations
 */
function handleToolCall(name, args = {}) {
  const globalMemDir = getGlobalMemoryPath();
  const teamMemDir = path.join(process.cwd(), '.openguild');
  initMemoryHub(false);

  const memoryDirs = [
    { label: 'Global Memory Vault', dir: globalMemDir },
  ];
  if (fs.existsSync(teamMemDir)) {
    memoryDirs.push({ label: 'Workspace Team Memory', dir: teamMemDir });
  }

  switch (name) {
    case 'openguild_read_memory': {
      if (args.file) {
        const basename = path.basename(args.file);
        for (const m of memoryDirs) {
          const filePath = path.join(m.dir, basename);
          if (fs.existsSync(filePath)) {
            const text = fs.readFileSync(filePath, 'utf8');
            return { content: [{ type: 'text', text: `# [${m.label}] ${basename}\n\n${text}` }] };
          }
        }
        return { content: [{ type: 'text', text: `Memory file "${args.file}" not found.` }], isError: true };
      } else {
        let aggregated = `# OpenGuild Memory Vaults\n\n`;
        for (const m of memoryDirs) {
          aggregated += `## 📂 ${m.label} (${m.dir})\n\n`;
          const files = fs.readdirSync(m.dir);
          for (const file of files) {
            const filePath = path.join(m.dir, file);
            if (fs.statSync(filePath).isFile()) {
              aggregated += `### File: ${file}\n\`\`\`markdown\n${fs.readFileSync(filePath, 'utf8')}\n\`\`\`\n\n`;
            }
          }
        }
        return { content: [{ type: 'text', text: aggregated.trim() }] };
      }
    }

    case 'openguild_write_memory': {
      const filename = path.basename(args.file || 'institutional_memory.md');
      const targetDir = args.scope === 'team' ? teamMemDir : globalMemDir;

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, filename);
      const mode = args.mode || 'append';
      const content = args.content.trim();

      if (mode === 'overwrite') {
        fs.writeFileSync(filePath, content + '\n', 'utf8');
      } else {
        const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
        const separator = existing.endsWith('\n') ? '' : '\n';
        fs.writeFileSync(filePath, `${existing}${separator}\n- [${new Date().toISOString().substring(0, 10)}] ${content}\n`, 'utf8');
      }

      return { content: [{ type: 'text', text: `Successfully persisted memory to "${filename}" in ${args.scope === 'team' ? 'team memory' : 'global memory'}.` }] };
    }

    case 'openguild_learn': {
      try {
        const res = recordLesson(args.insight, {
          scope: args.scope || 'global',
          category: args.category,
          tags: args.tags,
          projectDir: process.cwd(),
        });
        const scrubNotice = res.scrubbed ? '\n🛡️ [Security] Sensitive secrets/tokens were automatically scrubbed before saving.' : '';
        return {
          content: [{
            type: 'text',
            text: `✅ ${res.message}${scrubNotice}\n\n**Persisted Entry:**\n${res.entry}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to record lesson: ${err.message}` }], isError: true };
      }
    }

    case 'openguild_search_memory': {
      const query = (args.query || '').toLowerCase();
      const matches = [];

      for (const m of memoryDirs) {
        if (!fs.existsSync(m.dir)) continue;
        const files = fs.readdirSync(m.dir);
        for (const file of files) {
          const filePath = path.join(m.dir, file);
          if (fs.statSync(filePath).isFile()) {
            const text = fs.readFileSync(filePath, 'utf8');
            const lines = text.split(/\r?\n/);
            lines.forEach((line, idx) => {
              if (line.toLowerCase().includes(query)) {
                matches.push({ vault: m.label, file, lineNum: idx + 1, text: line.trim() });
              }
            });
          }
        }
      }

      if (matches.length === 0) {
        return { content: [{ type: 'text', text: `No matches found for query "${args.query}" in global or team memory.` }] };
      }

      let resultText = `# Search Results for "${args.query}" (${matches.length} matches):\n\n`;
      for (const match of matches) {
        resultText += `- **[${match.vault}] ${match.file}:${match.lineNum}** — ${match.text}\n`;
      }
      return { content: [{ type: 'text', text: resultText.trim() }] };
    }

    case 'openguild_consult_council': {
      const prompt = args.prompt;
      const requestedRoles = args.roles || [];
      const mode = (args.mode || 'consensus').toLowerCase();
      const selectedMembers = requestedRoles.length > 0
        ? COUNCIL_MEMBERS.filter(m => requestedRoles.includes(m.id))
        : COUNCIL_MEMBERS;

      let councilBrief = `# 🏛️ The 12-Expert Council Consultation\n\n`;
      councilBrief += `**Query:** ${prompt}\n`;
      councilBrief += `**Deliberation Mode:** ${mode.toUpperCase()}\n\n`;

      if (mode === 'debate') {
        councilBrief += `## ⚔️ Dialectical Tension & Trade-Off Analysis\n\n`;
        councilBrief += `- **Architect vs. Performance:** Ensure clean domain boundaries and abstraction layers without introducing object allocation churn, microservice network hops, or unindexed joins.\n`;
        councilBrief += `- **Product Velocity vs. Security:** Reject expedient shortcuts that bypass SAIF standards, input validation, CSRF/XSS escaping, or least-privilege tokens.\n`;
        councilBrief += `- **Simplicity (Apple CTO) vs. Internet-Scale (Google CTO):** Favor zero-friction simplicity for current user needs while preserving a zero-rewrite horizontal scaling path.\n\n`;
      } else if (mode === 'audit') {
        councilBrief += `## 🛡️ Security & Zero-Regression Audit Framework\n\n`;
        councilBrief += `- **SAIF Standards:** Verify zero credential exposure, sanitized user inputs, and hardened memory boundaries.\n`;
        councilBrief += `- **Deterministic Invariants:** Require automated unit/integration test coverage and explicit null/edge-case handling before merging.\n\n`;
      }

      councilBrief += `## 👥 Expert Review Perspectives:\n\n`;
      for (const m of selectedMembers) {
        councilBrief += `### ${m.icon} ${m.title} (${m.domain})\n`;
        councilBrief += `*Perspective:* Evaluate against core invariants, domain modeling, algorithmic latency, and world-class product excellence.\n\n`;
      }

      return { content: [{ type: 'text', text: councilBrief.trim() }] };
    }

    case 'openguild_get_project_context': {
      const targetDir = args.projectPath ? path.resolve(args.projectPath) : process.cwd();
      let files = [];
      try {
        files = fs.readdirSync(targetDir);
      } catch {
        return { content: [{ type: 'text', text: `Could not read directory "${targetDir}".` }], isError: true };
      }

      const stack = detectStack(files, targetDir);
      const teamPath = fs.existsSync(path.join(targetDir, '.openguild')) ? path.join(targetDir, '.openguild') : null;
      const rule = buildRuleContent(path.basename(targetDir), globalMemDir, stack, 'full', teamPath);

      const contextText = `# Workspace Context: ${path.basename(targetDir)}
- **Language:** ${stack.lang}
- **Framework:** ${stack.framework}
- **Package Manager:** ${stack.pkgManager}
- **Monorepo:** ${stack.isMonorepo ? stack.monorepoTool : 'No'}
- **Team Memory:** ${teamPath ? 'Active (.openguild)' : 'Not initialized'}

## Deterministic Verification Invariants
- **Test:** \`${stack.testCmd}\`
- **Lint:** \`${stack.lintCmd}\`
- **Typecheck:** \`${stack.typecheckCmd}\`

## Generated Rule Specification
\`\`\`markdown
${rule}
\`\`\`
`;
      return { content: [{ type: 'text', text: contextText.trim() }] };
    }

    case 'openguild_auto_analyze': {
      try {
        const input = args.vision || args.projectPath || process.cwd();
        const blueprint = autoAnalyze(input, { projectDir: process.cwd() });
        return { content: [{ type: 'text', text: blueprint }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Auto-analysis failed: ${err.message}` }], isError: true };
      }
    }

    case 'openguild_profile_tokens': {
      try {
        const targetDir = args.projectPath ? path.resolve(args.projectPath) : process.cwd();
        const result = profileTokens(targetDir);
        return { content: [{ type: 'text', text: result.reportMarkdown }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Token profiling failed: ${err.message}` }], isError: true };
      }
    }

    case 'openguild_verify_invariants': {
      try {
        const targetDir = args.projectPath ? path.resolve(args.projectPath) : process.cwd();
        const result = verifyProject(targetDir, { autoFix: args.autoFix });
        return { content: [{ type: 'text', text: result.reportMarkdown }], isError: !result.passed };
      } catch (err) {
        return { content: [{ type: 'text', text: `Verification failed: ${err.message}` }], isError: true };
      }
    }

    case 'openguild_audit_security': {
      try {
        const targetDir = args.projectPath ? path.resolve(args.projectPath) : process.cwd();
        const result = auditSecurity(targetDir);
        return { content: [{ type: 'text', text: result.reportMarkdown }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Security audit failed: ${err.message}` }], isError: true };
      }
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: "${name}"` }], isError: true };
  }
}

/**
 * Start the MCP JSON-RPC 2.0 Server over stdio.
 */
function startMcpServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  function sendResponse(id, result, error = null) {
    const payload = { jsonrpc: '2.0', id };
    if (error) {
      payload.error = error;
    } else {
      payload.result = result;
    }
    process.stdout.write(JSON.stringify(payload) + '\n');
  }

  rl.on('line', (line) => {
    if (!line.trim()) return;

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      sendResponse(null, null, { code: -32700, message: 'Parse error' });
      return;
    }

    const { id, method, params } = message;

    // Handle JSON-RPC Notifications
    if (id === undefined || id === null) {
      return;
    }

    switch (method) {
      case 'initialize':
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'openguild',
            version: VERSION,
          },
        });
        break;

      case 'notifications/initialized':
        // Client confirmed initialization
        break;

      case 'ping':
        sendResponse(id, {});
        break;

      case 'tools/list':
        sendResponse(id, {
          tools: MCP_TOOLS,
        });
        break;

      case 'tools/call': {
        const { name, arguments: toolArgs } = params || {};
        try {
          const result = handleToolCall(name, toolArgs);
          sendResponse(id, result);
        } catch (err) {
          sendResponse(id, null, { code: -32603, message: `Internal error: ${err.message}` });
        }
        break;
      }

      default:
        sendResponse(id, null, { code: -32601, message: `Method not found: ${method}` });
        break;
    }
  });

  process.stderr.write(`[OpenGuild MCP Server] v${VERSION} running over stdio (JSON-RPC 2.0)\n`);
}

module.exports = {
  MCP_TOOLS,
  handleToolCall,
  startMcpServer,
};
