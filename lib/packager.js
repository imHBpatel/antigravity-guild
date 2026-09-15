'use strict';

const fs = require('fs');
const path = require('path');
const { scrubSecrets } = require('./learn');

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.dylib', '.so', '.bin',
  '.mp4', '.mov', '.avi', '.mp3', '.wav',
  '.woff', '.woff2', '.ttf', '.eot',
]);

const IGNORED_DIRS = new Set([
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
  '.turbo',
  '.cache',
  'tmp',
  'temp',
]);

/**
 * Generate visual ASCII file tree.
 */
function generateAsciiTree(dir, prefix = '', maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return '';
  let output = '';

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.git'));

    entries.sort((a, b) => {
      if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
      return a.isDirectory() ? -1 : 1;
    });

    entries.forEach((entry, idx) => {
      const isLast = idx === entries.length - 1;
      const pointer = isLast ? '└── ' : '├── ';
      const subPrefix = isLast ? '    ' : '│   ';

      output += `${prefix}${pointer}${entry.isDirectory() ? '📁 ' : '📄 '}${entry.name}\n`;

      if (entry.isDirectory()) {
        output += generateAsciiTree(path.join(dir, entry.name), prefix + subPrefix, maxDepth, currentDepth + 1);
      }
    });
  } catch {
    // Ignore unreadable
  }

  return output;
}

/**
 * Recursively collect non-binary source files.
 */
function collectPackableFiles(dir, rootDir = dir, maxFiles = 100) {
  let files = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name) || (entry.name.startsWith('.') && entry.name !== '.env')) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files = files.concat(collectPackableFiles(fullPath, rootDir, maxFiles));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!BINARY_EXTS.has(ext)) {
          files.push(fullPath);
        }
      }

      if (files.length >= maxFiles) break;
    }
  } catch {
    // Ignore unreadable
  }

  return files;
}

/**
 * Infer markdown code fence language from file extension.
 */
function inferLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.json': 'json',
    '.md': 'markdown',
    '.html': 'html',
    '.css': 'css',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sh': 'bash',
    '.sql': 'sql',
  };
  return map[ext] || '';
}

/**
 * Package a project codebase into a token-optimized markdown bundle.
 *
 * @param {string} targetDir - Directory to package.
 * @param {object} options - { outputFile, maxFiles, maxTokens }
 * @returns {object} { targetDir, fileCount, totalTokens, totalChars, tree, bundleMarkdown, outputPath }
 */
function packCodebase(targetDir = process.cwd(), options = {}) {
  const rootDir = path.resolve(targetDir);
  const maxFiles = options.maxFiles || 60;
  const maxTokens = options.maxTokens || 40000;
  const projectName = path.basename(rootDir);

  const files = collectPackableFiles(rootDir, rootDir, maxFiles);
  const tree = generateAsciiTree(rootDir);

  let bundle = `# 📦 OmniGuild Codebase Context Bundle: ${projectName}\n\n`;
  bundle += `Generated on: ${new Date().toISOString()}\n`;
  bundle += `Total files indexed: ${files.length}\n\n`;

  bundle += `## 🗂️ Directory Structure\n\`\`\`text\n${tree.trim()}\n\`\`\`\n\n`;
  bundle += `## 📄 Source Files Content\n\n`;

  let currentTokens = Math.ceil(bundle.length / 4);
  let packedFilesCount = 0;

  for (const filePath of files) {
    try {
      const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const { sanitized } = scrubSecrets(rawContent);
      const lang = inferLanguage(filePath);

      let fileBlock = `### File: \`${relPath}\`\n\`\`\`${lang}\n${sanitized}\n\`\`\`\n\n`;
      const blockTokens = Math.ceil(fileBlock.length / 4);

      if (currentTokens + blockTokens > maxTokens && packedFilesCount > 0) {
        const omitted = files.length - packedFilesCount;
        bundle += `*... [Truncated ${omitted} remaining files to preserve token budget ceiling (${maxTokens} tokens)]*\n`;
        break;
      }

      bundle += fileBlock;
      currentTokens += blockTokens;
      packedFilesCount++;
    } catch {
      // Ignore read errors
    }
  }

  let outputPath = null;
  if (options.outputFile) {
    outputPath = path.resolve(rootDir, options.outputFile);
    fs.writeFileSync(outputPath, bundle, 'utf8');
  }

  return {
    targetDir: rootDir,
    fileCount: packedFilesCount,
    totalFilesDiscovered: files.length,
    totalTokens: currentTokens,
    totalChars: bundle.length,
    tree,
    outputPath,
    bundleMarkdown: bundle.trim(),
  };
}

module.exports = {
  BINARY_EXTS,
  IGNORED_DIRS,
  generateAsciiTree,
  collectPackableFiles,
  inferLanguage,
  packCodebase,
};
