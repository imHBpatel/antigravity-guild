'use strict';

const fs = require('fs');
const path = require('path');

// Directories to exclude from AST symbol traversal
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.venv',
  'venv',
  '__pycache__',
  'target',
  'vendor',
  '.openguild',
  '.gemini',
  '.cursor',
  '.vscode',
  'out',
  '.turbo',
  '.cache',
  'tmp',
  'temp',
]);

// File extensions mapped to language parsers
const SUPPORTED_EXTS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py',
  '.go',
  '.rs',
]);

/**
 * Extract symbols from a JavaScript / TypeScript file.
 */
function extractJsTsSymbols(content) {
  const symbols = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Class definition: [export] class Foo [extends Bar] [implements Baz]
    const classMatch = line.match(/^(?:export\s+(?:default\s+)?)?class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+[A-Za-z0-9_$]+)?/);
    if (classMatch) {
      symbols.push({ name: classMatch[1], kind: 'class', line: lineNum, signature: line.replace(/\{$/, '').trim() });
      continue;
    }

    // Interface definition: [export] interface Foo
    const ifaceMatch = line.match(/^(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/);
    if (ifaceMatch) {
      symbols.push({ name: ifaceMatch[1], kind: 'interface', line: lineNum, signature: line.replace(/\{$/, '').trim() });
      continue;
    }

    // Type alias: [export] type Foo = ...
    const typeMatch = line.match(/^(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=/);
    if (typeMatch) {
      symbols.push({ name: typeMatch[1], kind: 'type', line: lineNum, signature: line.trim() });
      continue;
    }

    // Function declaration: [export] [async] function foo(...)
    const fnMatch = line.match(/^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      const isAsync = line.includes('async ');
      symbols.push({
        name: fnMatch[1],
        kind: 'function',
        line: lineNum,
        signature: `${isAsync ? 'async ' : ''}function ${fnMatch[1]}(${fnMatch[2].trim()})`,
      });
      continue;
    }

    // Exported const/let arrow or function expression: export const foo = (..) => ...
    const constFnMatch = line.match(/^export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|[A-Za-z0-9_$]+)\s*=>/);
    if (constFnMatch) {
      symbols.push({
        name: constFnMatch[1],
        kind: 'function',
        line: lineNum,
        signature: `export const ${constFnMatch[1]} = (${(constFnMatch[2] || '').trim()}) =>`,
      });
      continue;
    }

    // Class methods / object methods (simple heuristics for indented methods)
    const methodMatch = line.match(/^(?:async\s+)?([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'function'].includes(methodMatch[1])) {
      const isAsync = line.startsWith('async ');
      symbols.push({
        name: methodMatch[1],
        kind: 'method',
        line: lineNum,
        signature: `${isAsync ? 'async ' : ''}${methodMatch[1]}(${methodMatch[2].trim()})`,
      });
    }
  }

  return symbols;
}

/**
 * Extract symbols from a Python file.
 */
function extractPythonSymbols(content) {
  const symbols = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Class definition: class Foo[(...)]:
    const classMatch = trimmed.match(/^class\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?\s*:/);
    if (classMatch) {
      const base = classMatch[2] ? `(${classMatch[2]})` : '';
      symbols.push({ name: classMatch[1], kind: 'class', line: lineNum, signature: `class ${classMatch[1]}${base}` });
      continue;
    }

    // Function/method definition: [async] def foo(...):
    const fnMatch = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?\s*:/);
    if (fnMatch) {
      const isMethod = line.startsWith('    ') || line.startsWith('\t');
      const isAsync = trimmed.startsWith('async ');
      const ret = fnMatch[3] ? ` -> ${fnMatch[3].trim()}` : '';
      symbols.push({
        name: fnMatch[1],
        kind: isMethod ? 'method' : 'function',
        line: lineNum,
        signature: `${isAsync ? 'async ' : ''}def ${fnMatch[1]}(${fnMatch[2].trim()})${ret}`,
      });
    }
  }

  return symbols;
}

/**
 * Extract symbols from a Go file.
 */
function extractGoSymbols(content) {
  const symbols = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Struct / Interface: type Foo struct / interface
    const typeMatch = line.match(/^type\s+([A-Za-z0-9_]+)\s+(struct|interface)/);
    if (typeMatch) {
      symbols.push({ name: typeMatch[1], kind: typeMatch[2], line: lineNum, signature: `type ${typeMatch[1]} ${typeMatch[2]}` });
      continue;
    }

    // Method on struct: func (r *Receiver) MethodName(...) ...
    const methodMatch = line.match(/^func\s*\(([^)]+)\)\s*([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*(.+))?/);
    if (methodMatch) {
      const ret = methodMatch[4] ? ` ${methodMatch[4].replace(/\{$/, '').trim()}` : '';
      symbols.push({
        name: methodMatch[2],
        kind: 'method',
        line: lineNum,
        signature: `func (${methodMatch[1].trim()}) ${methodMatch[2]}(${methodMatch[3].trim()})${ret}`,
      });
      continue;
    }

    // Standalone function: func FuncName(...) ...
    const fnMatch = line.match(/^func\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*(.+))?/);
    if (fnMatch) {
      const ret = fnMatch[3] ? ` ${fnMatch[3].replace(/\{$/, '').trim()}` : '';
      symbols.push({
        name: fnMatch[1],
        kind: 'function',
        line: lineNum,
        signature: `func ${fnMatch[1]}(${fnMatch[2].trim()})${ret}`,
      });
    }
  }

  return symbols;
}

/**
 * Extract symbols from a Rust file.
 */
function extractRustSymbols(content) {
  const symbols = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Struct / Enum: [pub] struct Foo / enum Foo
    const structMatch = line.match(/^(?:pub(?:\([^)]+\))?\s+)?(struct|enum)\s+([A-Za-z0-9_]+)/);
    if (structMatch) {
      symbols.push({ name: structMatch[2], kind: structMatch[1], line: lineNum, signature: `${structMatch[1]} ${structMatch[2]}` });
      continue;
    }

    // Trait: [pub] trait Foo
    const traitMatch = line.match(/^(?:pub(?:\([^)]+\))?\s+)?trait\s+([A-Za-z0-9_]+)/);
    if (traitMatch) {
      symbols.push({ name: traitMatch[1], kind: 'trait', line: lineNum, signature: `trait ${traitMatch[1]}` });
      continue;
    }

    // Impl: impl [Trait for] Foo
    const implMatch = line.match(/^impl(?:\s+<[^>]+>)?(?:\s+([A-Za-z0-9_]+)\s+for)?\s+([A-Za-z0-9_]+)/);
    if (implMatch) {
      const desc = implMatch[1] ? `impl ${implMatch[1]} for ${implMatch[2]}` : `impl ${implMatch[2]}`;
      symbols.push({ name: implMatch[2], kind: 'impl', line: lineNum, signature: desc });
      continue;
    }

    // Function: [pub] [async] fn foo(...) [-> ReturnType]
    const fnMatch = line.match(/^(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/);
    if (fnMatch) {
      const isPub = line.startsWith('pub');
      const isAsync = line.includes('async fn');
      const ret = fnMatch[3] ? ` -> ${fnMatch[3].trim()}` : '';
      symbols.push({
        name: fnMatch[1],
        kind: 'function',
        line: lineNum,
        signature: `${isPub ? 'pub ' : ''}${isAsync ? 'async ' : ''}fn ${fnMatch[1]}(${fnMatch[2].trim()})${ret}`,
      });
    }
  }

  return symbols;
}

/**
 * Extract symbols from file content given its extension.
 */
function extractSymbols(content, ext) {
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    return extractJsTsSymbols(content);
  } else if (ext === '.py') {
    return extractPythonSymbols(content);
  } else if (ext === '.go') {
    return extractGoSymbols(content);
  } else if (ext === '.rs') {
    return extractRustSymbols(content);
  }
  return [];
}

/**
 * Recursively scan a directory for supported source files.
 */
function collectSourceFiles(dir, maxDepth = 6, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  let files = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
      }
      if (EXCLUDED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(collectSourceFiles(fullPath, maxDepth, currentDepth + 1));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Ignore unreadable directories
  }

  return files;
}

/**
 * Generate a token-efficient AST Symbol Repo-Map.
 *
 * @param {string} targetDir - Root directory to analyze.
 * @param {object} options - Options: { query, maxTokens, maxFiles }
 * @returns {object} { filesCount, symbolsCount, tokenEstimate, mapMarkdown }
 */
function generateRepoMap(targetDir = process.cwd(), options = {}) {
  const rootDir = path.resolve(targetDir);
  const query = (options.query || '').trim().toLowerCase();
  const maxTokens = options.maxTokens || 800; // conservative token ceiling
  const sourceFiles = collectSourceFiles(rootDir);

  const fileSymbolMaps = [];
  let totalSymbols = 0;

  for (const filePath of sourceFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();
      let symbols = extractSymbols(content, ext);

      if (query) {
        symbols = symbols.filter(s =>
          s.name.toLowerCase().includes(query) ||
          s.signature.toLowerCase().includes(query) ||
          path.relative(rootDir, filePath).toLowerCase().includes(query)
        );
      }

      if (symbols.length > 0) {
        totalSymbols += symbols.length;
        const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
        fileSymbolMaps.push({ relPath, symbols });
      }
    } catch {
      // Ignore unreadable files
    }
  }

  // Sort files with most matching symbols first or alphabetically
  fileSymbolMaps.sort((a, b) => {
    if (query) {
      return b.symbols.length - a.symbols.length;
    }
    return a.relPath.localeCompare(b.relPath);
  });

  // Build markdown representation with token budgeting
  let markdown = `# 🗺️ AST Symbol Repo-Map: ${path.basename(rootDir)}\n\n`;
  if (query) {
    markdown += `> Filtered by query: **"${query}"**\n\n`;
  }

  let currentTokens = Math.ceil(markdown.length / 4);
  let renderedFiles = 0;

  for (const item of fileSymbolMaps) {
    let fileBlock = `### \`${item.relPath}\`\n`;
    for (const sym of item.symbols) {
      const kindIcon = sym.kind === 'class' ? '🏛️'
        : sym.kind === 'interface' ? '📐'
        : sym.kind === 'type' ? '🏷️'
        : sym.kind === 'method' ? '⚡'
        : '🔹';
      fileBlock += `- ${kindIcon} **${sym.name}** (\`${sym.kind}\`, L${sym.line}): \`${sym.signature}\`\n`;
    }
    fileBlock += '\n';

    const blockTokens = Math.ceil(fileBlock.length / 4);
    if (currentTokens + blockTokens > maxTokens && renderedFiles > 0) {
      const remainingFiles = fileSymbolMaps.length - renderedFiles;
      markdown += `*... [Truncated ${remainingFiles} additional files to stay within ${maxTokens}-token budget]*\n`;
      break;
    }

    markdown += fileBlock;
    currentTokens += blockTokens;
    renderedFiles++;
  }

  if (fileSymbolMaps.length === 0) {
    markdown += query
      ? `No symbols matching "${query}" were found in ${sourceFiles.length} source files.\n`
      : `No source symbols found across ${sourceFiles.length} files.\n`;
  }

  return {
    filesCount: sourceFiles.length,
    matchedFilesCount: fileSymbolMaps.length,
    symbolsCount: totalSymbols,
    tokenEstimate: currentTokens,
    mapMarkdown: markdown.trim(),
  };
}

module.exports = {
  EXCLUDED_DIRS,
  SUPPORTED_EXTS,
  extractSymbols,
  extractJsTsSymbols,
  extractPythonSymbols,
  extractGoSymbols,
  extractRustSymbols,
  collectSourceFiles,
  generateRepoMap,
};
