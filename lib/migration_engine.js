/**
 * Superpower 31: Automated Codemod & Migration Engine
 * 
 * Inspired by Codemod.com, OpenRewrite, jscodeshift.
 * AST-based automated code transformations for common migration
 * patterns — all with zero external dependencies.
 * 
 * Built-in transforms:
 * - cjs-to-esm: require() → import, module.exports → export
 * - callback-to-async: callback patterns → async/await
 * - var-to-const: var → const/let
 * - template-literals: string concatenation → template literals
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Transform Registry ─────────────────────────────────────────────────
const TRANSFORMS = {
  'cjs-to-esm': {
    name: 'CommonJS → ES Modules',
    description: 'Convert require() to import and module.exports to export',
    apply: transformCjsToEsm,
  },
  'var-to-const': {
    name: 'var → const/let',
    description: 'Modernize variable declarations from var to const/let',
    apply: transformVarToConst,
  },
  'template-literals': {
    name: 'String Concatenation → Template Literals',
    description: 'Convert string concatenation with + to template literals',
    apply: transformToTemplateLiterals,
  },
  'callback-to-async': {
    name: 'Callbacks → Async/Await',
    description: 'Convert common callback patterns to async/await',
    apply: transformCallbackToAsync,
  },
  'strict-mode': {
    name: 'Add "use strict"',
    description: 'Add "use strict" directive to files that lack it',
    apply: transformAddStrictMode,
  },
  'console-cleanup': {
    name: 'Console Cleanup',
    description: 'Remove or comment out console.log statements',
    apply: transformConsoleCleanup,
  },
};

// ── CJS → ESM Transform ───────────────────────────────────────────────
/**
 * Convert CommonJS patterns to ES Module syntax.
 */
function transformCjsToEsm(code, fileName) {
  let result = code;
  const changes = [];

  // const X = require('Y') → import X from 'Y'
  result = result.replace(
    /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?/g,
    (match, name, mod) => {
      changes.push(`require('${mod}') → import ${name} from '${mod}'`);
      return `import ${name} from '${mod}';`;
    }
  );

  // const { X, Y } = require('Z') → import { X, Y } from 'Z'
  result = result.replace(
    /(?:const|let|var)\s+\{([^}]+)\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?/g,
    (match, names, mod) => {
      const cleanNames = names.split(',').map(n => n.trim()).filter(Boolean).join(', ');
      changes.push(`destructured require('${mod}') → import { ${cleanNames} }`);
      return `import { ${cleanNames} } from '${mod}';`;
    }
  );

  // module.exports = X → export default X
  result = result.replace(
    /module\.exports\s*=\s*(\w+)\s*;?/g,
    (match, name) => {
      changes.push(`module.exports = ${name} → export default ${name}`);
      return `export default ${name};`;
    }
  );

  // module.exports = { X, Y } → export { X, Y } (or export default { ... })
  result = result.replace(
    /module\.exports\s*=\s*\{([^}]+)\}\s*;?/g,
    (match, contents) => {
      // Check if these are named exports (identifiers only) or a literal object
      const items = contents.split(',').map(s => s.trim()).filter(Boolean);
      const allIdentifiers = items.every(item => /^\w+$/.test(item));
      
      if (allIdentifiers) {
        changes.push(`module.exports = { ... } → named exports`);
        return `export { ${items.join(', ')} };`;
      }
      changes.push(`module.exports = { ... } → export default { ... }`);
      return `export default { ${contents} };`;
    }
  );

  // exports.X = Y → export const X = Y (or export function)
  result = result.replace(
    /exports\.(\w+)\s*=\s*(function\s+)?/g,
    (match, name, isFunc) => {
      if (isFunc) {
        changes.push(`exports.${name} = function → export function ${name}`);
        return `export function ${name}`;
      }
      changes.push(`exports.${name} = → export const ${name} =`);
      return `export const ${name} = `;
    }
  );

  return { code: result, changes };
}

// ── var → const/let Transform ──────────────────────────────────────────
/**
 * Replace var declarations with const or let based on reassignment analysis.
 */
function transformVarToConst(code, fileName) {
  const changes = [];
  const lines = code.split('\n');
  const result = [];

  // First pass: find all variables declared with var and check reassignment
  const varDeclarations = new Map(); // name → line indices
  const reassigned = new Set();

  for (let i = 0; i < lines.length; i++) {
    const varMatch = lines[i].match(/\bvar\s+(\w+)\b/);
    if (varMatch) {
      varDeclarations.set(varMatch[1], i);
    }
  }

  // Check for reassignment (name = value, name++, name--, etc.)
  for (let i = 0; i < lines.length; i++) {
    for (const [name, declLine] of varDeclarations) {
      if (i === declLine) continue; // Skip the declaration line
      // Look for reassignment patterns
      const reassignPattern = new RegExp(`\\b${name}\\s*(?:[+\\-*/|&^%]?=(?!=))|\\b${name}\\s*\\+\\+|\\+\\+\\s*${name}\\b|\\b${name}\\s*--|--\\s*${name}\\b`);
      if (reassignPattern.test(lines[i])) {
        reassigned.add(name);
      }
    }
  }

  // Second pass: replace var with const or let
  for (const line of lines) {
    let newLine = line;
    const varMatch = line.match(/\bvar\s+(\w+)\b/);
    if (varMatch) {
      const name = varMatch[1];
      const replacement = reassigned.has(name) ? 'let' : 'const';
      newLine = line.replace(/\bvar\b/, replacement);
      changes.push(`var ${name} → ${replacement} ${name}`);
    }
    result.push(newLine);
  }

  return { code: result.join('\n'), changes };
}

// ── Template Literals Transform ────────────────────────────────────────
/**
 * Convert string concatenation to template literals.
 * "Hello " + name + "!" → `Hello ${name}!`
 */
function transformToTemplateLiterals(code, fileName) {
  const changes = [];

  // Match: "string" + expr + "string" patterns
  const result = code.replace(
    /(['"])([^'"]*)\1\s*\+\s*(\w+(?:\.\w+)*)\s*(?:\+\s*(['"])([^'"]*)\4)?/g,
    (match, q1, str1, expr, q2, str2) => {
      if (str2 !== undefined) {
        changes.push(`String concat → template literal: \`${str1}\${${expr}}${str2}\``);
        return `\`${str1}\${${expr}}${str2}\``;
      }
      changes.push(`String concat → template literal: \`${str1}\${${expr}}\``);
      return `\`${str1}\${${expr}}\``;
    }
  );

  return { code: result, changes };
}

// ── Callback → Async/Await Transform ───────────────────────────────────
/**
 * Convert common Node.js callback patterns to async/await.
 */
function transformCallbackToAsync(code, fileName) {
  const changes = [];

  // fs.readFile(path, encoding, (err, data) => { ... })
  // → const data = await fs.promises.readFile(path, encoding)
  let result = code.replace(
    /fs\.readFile\s*\(\s*([^,]+),\s*([^,]+),\s*(?:function\s*)?\(\s*\w+\s*,\s*(\w+)\s*\)\s*(?:=>)?\s*\{/g,
    (match, filePath, encoding, dataVar) => {
      changes.push(`fs.readFile callback → fs.promises.readFile with await`);
      return `const ${dataVar} = await fs.promises.readFile(${filePath}, ${encoding});\n{`;
    }
  );

  // fs.writeFile(path, data, (err) => { ... })
  result = result.replace(
    /fs\.writeFile\s*\(\s*([^,]+),\s*([^,]+),\s*(?:function\s*)?\(\s*\w+\s*\)\s*(?:=>)?\s*\{/g,
    (match, filePath, data) => {
      changes.push(`fs.writeFile callback → fs.promises.writeFile with await`);
      return `await fs.promises.writeFile(${filePath}, ${data});\n{`;
    }
  );

  // setTimeout with promisification hint
  result = result.replace(
    /setTimeout\s*\(\s*(?:function\s*)?\(\s*\)\s*(?:=>)?\s*\{([^}]*)\}\s*,\s*(\d+)\s*\)/g,
    (match, body, ms) => {
      if (body.trim().length < 100) {
        changes.push(`setTimeout → await with timers/promises`);
        return `await new Promise(resolve => setTimeout(resolve, ${ms}));\n${body.trim()}`;
      }
      return match;
    }
  );

  return { code: result, changes };
}

// ── Add "use strict" Transform ─────────────────────────────────────────
/**
 * Add "use strict" directive to files that don't have it.
 */
function transformAddStrictMode(code, fileName) {
  const changes = [];

  if (!code.includes("'use strict'") && !code.includes('"use strict"')) {
    changes.push('Added "use strict" directive');
    return { code: "'use strict';\n\n" + code, changes };
  }

  return { code, changes };
}

// ── Console Cleanup Transform ──────────────────────────────────────────
/**
 * Comment out or remove console.log/debug/info statements.
 * Preserves console.error and console.warn.
 */
function transformConsoleCleanup(code, fileName) {
  const changes = [];
  const lines = code.split('\n');
  const result = [];

  for (const line of lines) {
    if (/\bconsole\.(log|debug|info|trace)\s*\(/.test(line) && !line.trim().startsWith('//')) {
      result.push('// ' + line.trimStart()); // Comment out instead of delete
      changes.push(`Commented out: ${line.trim().substring(0, 60)}...`);
    } else {
      result.push(line);
    }
  }

  return { code: result.join('\n'), changes };
}

// ── File Processing ────────────────────────────────────────────────────
/**
 * Apply a transform to a single file.
 * @param {string} filePath — absolute path to the file
 * @param {string} transformId — transform name from TRANSFORMS registry
 * @param {boolean} dryRun — if true, don't write changes
 * @returns {{ filePath, changes, preview }}
 */
function applyTransformToFile(filePath, transformId, dryRun = false) {
  const transform = TRANSFORMS[transformId];
  if (!transform) throw new Error(`Unknown transform: ${transformId}`);

  const content = fs.readFileSync(filePath, 'utf8');
  const { code, changes } = transform.apply(content, path.basename(filePath));

  if (changes.length === 0) {
    return { filePath, changes: [], preview: null, modified: false };
  }

  // Generate diff preview
  const preview = generateDiffPreview(content, code, filePath);

  if (!dryRun) {
    // Create backup
    const backupPath = filePath + '.bak';
    fs.writeFileSync(backupPath, content, 'utf8');
    // Write transformed code
    fs.writeFileSync(filePath, code, 'utf8');
  }

  return { filePath, changes, preview, modified: true, backupPath: dryRun ? null : filePath + '.bak' };
}

/**
 * Generate a simple unified diff preview.
 */
function generateDiffPreview(original, modified, filePath) {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const diff = [];
  const maxLen = Math.max(origLines.length, modLines.length);

  diff.push(`--- a/${path.basename(filePath)}`);
  diff.push(`+++ b/${path.basename(filePath)}`);

  for (let i = 0; i < maxLen; i++) {
    const origLine = origLines[i];
    const modLine = modLines[i];

    if (origLine === modLine) continue;

    if (origLine !== undefined && modLine !== undefined && origLine !== modLine) {
      diff.push(`@@ line ${i + 1} @@`);
      diff.push(`- ${origLine}`);
      diff.push(`+ ${modLine}`);
    } else if (origLine !== undefined && modLine === undefined) {
      diff.push(`@@ line ${i + 1} @@`);
      diff.push(`- ${origLine}`);
    } else if (origLine === undefined && modLine !== undefined) {
      diff.push(`@@ line ${i + 1} @@`);
      diff.push(`+ ${modLine}`);
    }
  }

  return diff.join('\n');
}

// ── Batch Processing ───────────────────────────────────────────────────
/**
 * Apply a transform to all matching files in a directory.
 */
function applyTransformToDirectory(dirPath, transformId, dryRun = false) {
  const files = collectFiles(dirPath);
  const results = [];

  for (const file of files) {
    try {
      const result = applyTransformToFile(file, transformId, dryRun);
      if (result.modified) results.push(result);
    } catch (err) {
      results.push({ filePath: file, error: err.message, modified: false });
    }
  }

  return results;
}

/**
 * Collect JavaScript/TypeScript files for transformation.
 */
function collectFiles(dir, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return [];
  const files = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor']);

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.has(entry.name) || (entry.isDirectory() && entry.name.startsWith('.'))) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectFiles(fullPath, maxDepth, depth + 1));
      } else if (/\.(js|ts|jsx|tsx|mjs|cjs)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (_) { /* skip */ }
  return files;
}

// ── Report Formatting ──────────────────────────────────────────────────
/**
 * Format migration results as Markdown.
 */
function formatMigrationReport(transformId, results, dryRun) {
  const transform = TRANSFORMS[transformId];
  const lines = [];

  lines.push(`# 🧬 Migration Engine: ${transform ? transform.name : transformId}`);
  lines.push('');
  lines.push(`> ${transform ? transform.description : 'Custom transform'}`);
  lines.push(`> Mode: ${dryRun ? '🔍 DRY RUN (no files modified)' : '✏️ APPLIED'}`);
  lines.push('');

  const modified = results.filter(r => r.modified);
  const errors = results.filter(r => r.error);
  const totalChanges = modified.reduce((s, r) => s + (r.changes?.length || 0), 0);

  lines.push(`## Summary`);
  lines.push(`- **Files Modified:** ${modified.length}`);
  lines.push(`- **Total Changes:** ${totalChanges}`);
  lines.push(`- **Errors:** ${errors.length}`);
  lines.push('');

  for (const result of modified) {
    lines.push(`### 📄 \`${path.basename(result.filePath)}\``);
    for (const change of result.changes) {
      lines.push(`- ${change}`);
    }
    if (result.preview) {
      lines.push('```diff');
      lines.push(result.preview);
      lines.push('```');
    }
    if (result.backupPath) {
      lines.push(`_Backup saved: \`${path.basename(result.backupPath)}\`_`);
    }
    lines.push('');
  }

  if (errors.length > 0) {
    lines.push('## ❌ Errors');
    for (const err of errors) {
      lines.push(`- \`${path.basename(err.filePath)}\`: ${err.error}`);
    }
  }

  return lines.join('\n');
}

// ── Custom Transform Loading ───────────────────────────────────────────
/**
 * Load custom transform recipes from .openguild/codemods/ directory.
 */
function loadCustomTransforms(projectRoot) {
  const codemodDir = path.join(projectRoot, '.openguild', 'codemods');
  if (!fs.existsSync(codemodDir)) return {};

  const customs = {};
  try {
    const entries = fs.readdirSync(codemodDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.js')) {
        const name = entry.name.replace('.js', '');
        try {
          // Custom transforms are simple search/replace JSON files
          // for safety, we don't eval arbitrary JS
          const content = fs.readFileSync(path.join(codemodDir, entry.name), 'utf8');
          const transform = JSON.parse(content);
          if (transform.search && transform.replace) {
            customs[`custom-${name}`] = {
              name: transform.name || name,
              description: transform.description || 'Custom transform',
              apply: (code) => {
                const regex = new RegExp(transform.search, transform.flags || 'g');
                const changes = [];
                const result = code.replace(regex, (...args) => {
                  changes.push(`Applied custom rule: ${name}`);
                  return transform.replace;
                });
                return { code: result, changes };
              },
            };
          }
        } catch (_) { /* skip invalid */ }
      }
    }
  } catch (_) { /* skip */ }

  return customs;
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Run a migration transform on the project.
 * @param {string} projectRoot — project directory
 * @param {string} transformId — transform to apply
 * @param {object} options — { dryRun: boolean, files: string[] }
 */
function runMigration(projectRoot, transformId, options = {}) {
  const dryRun = options.dryRun !== false;

  // Merge built-in + custom transforms
  const allTransforms = { ...TRANSFORMS, ...loadCustomTransforms(projectRoot) };

  if (!allTransforms[transformId]) {
    const available = Object.entries(allTransforms)
      .map(([id, t]) => `  - ${id}: ${t.description}`)
      .join('\n');
    return {
      report: `# 🧬 Migration Engine\n\n❌ Unknown transform: \`${transformId}\`\n\n## Available Transforms:\n${available}`,
      results: [],
    };
  }

  // Temporarily register custom transform
  if (!TRANSFORMS[transformId] && allTransforms[transformId]) {
    TRANSFORMS[transformId] = allTransforms[transformId];
  }

  const targetFiles = options.files
    ? options.files.map(f => path.isAbsolute(f) ? f : path.join(projectRoot, f))
    : null;

  let results;
  if (targetFiles) {
    results = targetFiles.map(f => {
      try { return applyTransformToFile(f, transformId, dryRun); }
      catch (err) { return { filePath: f, error: err.message, modified: false }; }
    }).filter(r => r.modified || r.error);
  } else {
    results = applyTransformToDirectory(projectRoot, transformId, dryRun);
  }

  const report = formatMigrationReport(transformId, results, dryRun);
  return { report, results };
}

/**
 * List all available transforms.
 */
function listTransforms(projectRoot) {
  const customs = loadCustomTransforms(projectRoot || process.cwd());
  const all = { ...TRANSFORMS, ...customs };
  return Object.entries(all).map(([id, t]) => ({
    id, name: t.name, description: t.description,
    isCustom: !TRANSFORMS[id],
  }));
}

module.exports = {
  runMigration,
  listTransforms,
  applyTransformToFile,
  applyTransformToDirectory,
  transformCjsToEsm,
  transformVarToConst,
  transformToTemplateLiterals,
  transformCallbackToAsync,
  transformAddStrictMode,
  transformConsoleCleanup,
  TRANSFORMS,
};
