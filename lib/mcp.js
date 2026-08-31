'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { VERSION, TOOL_NAME, COUNCIL_MEMBERS } = require('./constants');
const { getGlobalMemoryPath, initMemoryHub } = require('./memory');
const { detectStack } = require('./detectors');
const { buildRuleContent } = require('./generator');

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
    description: 'Consult the 12-Expert Council on an engineering question, code review, performance optimization, or system design.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The question, architecture decision, or code diff to review.',
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
      const selectedMembers = requestedRoles.length > 0
        ? COUNCIL_MEMBERS.filter(m => requestedRoles.includes(m.id))
        : COUNCIL_MEMBERS;

      let councilBrief = `# 🏛️ The 12-Expert Council Consultation\n\n`;
      councilBrief += `**Query:** ${prompt}\n\n`;
      councilBrief += `**Expert Review Framework:**\n`;
      for (const m of selectedMembers) {
        councilBrief += `### ${m.icon} ${m.title} (${m.domain})\n`;
        councilBrief += `*Perspective:* Evaluate against core invariants, performance, security, and world-class product excellence.\n\n`;
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
