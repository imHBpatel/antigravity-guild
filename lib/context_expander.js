/**
 * OmniGuild Smart Context Expander
 *
 * Implements Cursor and Claude Code-style `@` directive expansion:
 * - `@symbol:name`  -> AST symbol extraction from repomap
 * - `@file:path#L1` -> Source file slice
 * - `@memory:query` -> Probabilistic BM25 memory retrieval
 * - `@graph:entity` -> Knowledge graph entity neighbor traversal
 * - `@git`          -> Active git diff and working tree status
 *
 * Pure Node.js built-ins. Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const { generateRepoMap } = require('./repomap');
const { searchMemoryVaults } = require('./hybrid_search');
const { pageInContext } = require('./knowledge_graph');
const { getGitDiff } = require('./pr_architect');

/**
 * Extracts directives from text.
 * @param {string} text
 * @returns {Array<{ type: string, target: string, raw: string }>}
 */
function extractDirectives(text = '') {
  const directives = [];
  const regex = /@(symbol|file|memory|graph|git)(?::([^\s]+))?/gi;
  let match;

  while ((match = regex.exec(text)) !== null) {
    directives.push({
      type: match[1].toLowerCase(),
      target: match[2] || '',
      raw: match[0]
    });
  }

  return directives;
}

/**
 * Expands all directives into a cohesive, token-budgeted prompt context.
 * @param {string} input
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {number} [options.maxTokens=2500]
 * @returns {{ expandedMarkdown: string, estimatedTokens: number, resolvedDirectives: string[] }}
 */
function expandContext(input = '', options = {}) {
  const cwd = options.cwd || process.cwd();
  const maxTokens = options.maxTokens || 2500;
  const directives = extractDirectives(input);

  let output = `# 🎯 OmniGuild Expanded Context\n\n`;
  const resolved = [];

  for (const d of directives) {
    if (d.type === 'symbol' && d.target) {
      const repomap = generateRepoMap(cwd, { query: d.target });
      output += `## 🔹 Symbol: \`${d.target}\`\n${repomap.markdown}\n\n`;
      resolved.push(d.raw);
    } else if (d.type === 'file' && d.target) {
      // Check for line range: e.g. lib/auth.js#10-30
      const parts = d.target.split('#');
      const filePath = path.isAbsolute(parts[0]) ? parts[0] : path.join(cwd, parts[0]);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        let lines = content.split('\n');

        if (parts[1]) {
          const range = parts[1].replace(/[Ll]/g, '').split('-');
          const start = Math.max(1, parseInt(range[0], 10) || 1);
          const end = Math.min(lines.length, parseInt(range[1], 10) || lines.length);
          lines = lines.slice(start - 1, end);
        }

        output += `## 📄 File: \`${parts[0]}\`\n\`\`\`${path.extname(parts[0]).replace('.', '') || 'text'}\n${lines.join('\n')}\n\`\`\`\n\n`;
        resolved.push(d.raw);
      }
    } else if (d.type === 'memory' && d.target) {
      const mem = searchMemoryVaults(d.target, { cwd, maxResults: 3 });
      output += `## 🧠 Memory Rules: "${d.target}"\n${mem.markdown}\n\n`;
      resolved.push(d.raw);
    } else if (d.type === 'graph') {
      const paged = pageInContext(d.target || '', cwd);
      output += `${paged.l1Context}\n\n`;
      resolved.push(d.raw);
    } else if (d.type === 'git') {
      const git = getGitDiff(cwd);
      output += `## 🌿 Git State (${git.source})\n`;
      output += git.diff ? `\`\`\`diff\n${git.diff.slice(0, 1500)}\n\`\`\`\n\n` : '_Working tree is clean._\n\n';
      resolved.push(d.raw);
    }
  }

  if (directives.length === 0) {
    output += `No @ directives detected in: "${input}".\nUse @symbol:name, @file:path, @memory:query, @graph:entity, or @git.\n`;
  }

  const estimatedTokens = Math.ceil(output.length / 4);

  return {
    expandedMarkdown: output.trim(),
    prompt: output.trim(),
    markdown: output.trim(),
    estimatedTokens,
    resolvedDirectives: resolved
  };
}

module.exports = {
  extractDirectives,
  expandContext
};
