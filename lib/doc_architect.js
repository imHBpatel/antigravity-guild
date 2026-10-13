/**
 * OmniGuild Living Architecture & Documentation Architect
 *
 * Automatically inspects the codebase, extracts AST symbol definitions,
 * analyzes internal module dependency graphs, and synthesizes Apple-grade
 * architectural blueprints with visual Mermaid topology diagrams.
 *
 * Pure Node.js built-ins. Zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { extractJsTsSymbols, EXCLUDED_DIRS } = require('./repomap');

/**
 * Extracts internal relative dependencies (require/import) from file content.
 * @param {string} content
 * @param {string} filePath
 * @returns {Array<string>}
 */
function extractInternalDependencies(content, filePath) {
  const deps = [];
  const dir = path.dirname(filePath);

  // Matches require('./...') or require('../...')
  const reqMatches = content.matchAll(/require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g);
  for (const m of reqMatches) {
    const rawTarget = m[1];
    const resolved = path.basename(rawTarget, path.extname(rawTarget));
    deps.push(resolved);
  }

  // Matches import ... from './...'
  const impMatches = content.matchAll(/import\s+(?:[^'"]+)\s+from\s+['"](\.[^'"]+)['"]/g);
  for (const m of impMatches) {
    const rawTarget = m[1];
    const resolved = path.basename(rawTarget, path.extname(rawTarget));
    deps.push(resolved);
  }

  return Array.from(new Set(deps));
}

/**
 * Scans a project directory for source files.
 * @param {string} rootDir
 * @param {number} maxFiles
 * @returns {Array<string>}
 */
function scanSourceFiles(rootDir, maxFiles = 50) {
  const results = [];

  function traverse(dir) {
    if (results.length >= maxFiles) return;

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break;

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          traverse(path.join(dir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext)) {
          results.push(path.join(dir, entry.name));
        }
      }
    }
  }

  traverse(rootDir);
  return results;
}

/**
 * Generates Mermaid diagram markup representing module dependencies.
 * @param {Array<{ name: string, deps: Array<string> }>} modules
 * @returns {string}
 */
function generateMermaidDiagram(modules = []) {
  let mermaid = `\`\`\`mermaid\nflowchart TD\n`;
  mermaid += `  subgraph Core["🏛️ OmniGuild Architecture & Subsystems"]\n`;

  const nodeSet = new Set();
  const edges = [];

  for (const mod of modules) {
    const safeName = mod.name.replace(/[^a-zA-Z0-9_]/g, '_');
    nodeSet.add(`    ${safeName}["📦 ${mod.name}"]`);

    for (const dep of mod.deps) {
      const safeDep = dep.replace(/[^a-zA-Z0-9_]/g, '_');
      nodeSet.add(`    ${safeDep}["📦 ${dep}"]`);
      edges.push(`    ${safeName} --> ${safeDep}`);
    }
  }

  for (const node of nodeSet) {
    mermaid += `${node}\n`;
  }
  for (const edge of edges.slice(0, 30)) { // limit edges to preserve clarity
    mermaid += `${edge}\n`;
  }

  mermaid += `  end\n\`\`\`\n`;
  return mermaid;
}

/**
 * Analyzes the codebase and generates comprehensive architecture documentation.
 * @param {string} projectDir
 * @param {object} options
 * @returns {object}
 */
function generateArchitectureDocs(projectDir = process.cwd(), options = {}) {
  const absDir = path.resolve(projectDir);
  const sourceFiles = scanSourceFiles(absDir, options.maxFiles || 40);

  const modules = [];
  const allSymbols = [];

  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const modName = path.basename(file, path.extname(file));
      const deps = extractInternalDependencies(content, file);
      const symbols = extractJsTsSymbols(content);

      modules.push({
        name: modName,
        relPath: path.relative(absDir, file).replace(/\\/g, '/'),
        deps,
        symbolsCount: symbols.length
      });

      for (const s of symbols) {
        allSymbols.push({
          module: modName,
          file: path.relative(absDir, file).replace(/\\/g, '/'),
          name: s.name,
          kind: s.kind,
          signature: s.signature
        });
      }
    } catch {
      // Continue if unreadable
    }
  }

  const mermaidDiagram = generateMermaidDiagram(modules);

  let md = `# 🏛️ Architecture & System Blueprint: ${path.basename(absDir)}\n\n`;
  md += `> **Generated Autonomously by OmniGuild Living Architecture Architect**\n`;
  md += `> **Inspected Files:** ${modules.length} modules | **Total Symbols Extracted:** ${allSymbols.length} AST symbols\n\n`;

  md += `## 🌐 Visual System Dependency Topology\n\n`;
  md += `${mermaidDiagram}\n\n`;

  md += `## 📦 Subsystems & Module Inventory\n\n`;
  md += `| Module | Relative Path | Symbols | Internal Dependencies |\n`;
  md += `|:---|:---|:---|:---|\n`;
  for (const mod of modules) {
    const depStr = mod.deps.length > 0 ? mod.deps.map(d => `\`${d}\``).join(', ') : '*None (Independent)*';
    md += `| **${mod.name}** | \`${mod.relPath}\` | ${mod.symbolsCount} | ${depStr} |\n`;
  }
  md += `\n`;

  md += `## 📑 Public API & Symbol Reference\n\n`;
  md += `| Symbol | Kind | Module | Signature |\n`;
  md += `|:---|:---|:---|:---|\n`;
  for (const sym of allSymbols.slice(0, 40)) {
    md += `| \`${sym.name}\` | \`${sym.kind}\` | \`${sym.module}\` | \`${sym.signature.replace(/\|/g, '\\|')}\` |\n`;
  }
  if (allSymbols.length > 40) {
    md += `| ... | ... | ... | *...and ${allSymbols.length - 40} more symbols* |\n`;
  }
  md += `\n`;

  md += `## 🛡️ Invariants & Security Architecture\n\n`;
  md += `1. **Deterministic Invariant Verification:** Tests, linters, and typechecks must yield zero non-zero exit codes.\n`;
  md += `2. **Hermetic Dependency Boundary:** 100% pure standard library execution with zero unverified external packages.\n`;
  md += `3. **Least-Privilege Context Diet:** High-efficiency prompt budgets, token minimization, and automated secret scrubbing.\n`;

  const outputPath = path.join(absDir, 'ARCHITECTURE.md');
  if (options.write) {
    fs.writeFileSync(outputPath, md, 'utf8');
  }

  return {
    markdown: md,
    mermaidDiagram,
    modulesCount: modules.length,
    symbolsCount: allSymbols.length,
    outputPath,
    written: Boolean(options.write)
  };
}

module.exports = {
  extractInternalDependencies,
  generateMermaidDiagram,
  generateArchitectureDocs
};
