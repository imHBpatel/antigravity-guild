'use strict';

const fs = require('fs');
const path = require('path');
const { VERSION, c } = require('./constants');
const { getGlobalMemoryPath, initMemoryHub } = require('./memory');

/**
 * Export the global memory vault into a portable JSON archive.
 *
 * @param {string} targetFile - Output JSON file path.
 * @returns {string} Written file path.
 */
function exportMemory(targetFile) {
  const memDir = getGlobalMemoryPath();
  initMemoryHub(false);

  const exportPath = targetFile
    ? path.resolve(targetFile)
    : path.join(process.cwd(), 'openguild-memory-backup.json');

  const files = fs.readdirSync(memDir);
  const archive = {
    schemaVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    engineVersion: VERSION,
    documents: {},
  };

  for (const file of files) {
    const fullPath = path.join(memDir, file);
    if (fs.statSync(fullPath).isFile()) {
      archive.documents[file] = fs.readFileSync(fullPath, 'utf8');
    }
  }

  fs.writeFileSync(exportPath, JSON.stringify(archive, null, 2), 'utf8');
  console.log(`${c.green}📦 [Exported]${c.reset} ${Object.keys(archive.documents).length} memory documents to: ${c.bold}${exportPath}${c.reset}`);
  return exportPath;
}

/**
 * Import a portable JSON memory archive into the local global memory vault.
 *
 * @param {string} sourceFile - Input JSON archive path.
 * @param {boolean} overwrite - If true, replaces matching files instead of appending.
 * @returns {number} Count of imported documents.
 */
function importMemory(sourceFile, overwrite = false) {
  const memDir = getGlobalMemoryPath();
  initMemoryHub(false);

  const importPath = path.resolve(sourceFile);
  if (!fs.existsSync(importPath)) {
    console.error(`${c.red}✖ File not found: ${importPath}${c.reset}`);
    return 0;
  }

  let archive;
  try {
    const raw = fs.readFileSync(importPath, 'utf8');
    archive = JSON.parse(raw);
  } catch (err) {
    console.error(`${c.red}✖ Invalid JSON archive: ${err.message}${c.reset}`);
    return 0;
  }

  if (!archive.documents || typeof archive.documents !== 'object') {
    console.error(`${c.red}✖ Unrecognized memory archive format.${c.reset}`);
    return 0;
  }

  let count = 0;
  for (const [filename, content] of Object.entries(archive.documents)) {
    const safeFilename = path.basename(filename);
    const destPath = path.join(memDir, safeFilename);

    if (fs.existsSync(destPath) && !overwrite) {
      // Append unique lines
      const existing = fs.readFileSync(destPath, 'utf8');
      const existingLines = new Set(existing.split(/\r?\n/).map(l => l.trim()));
      const incomingLines = content.split(/\r?\n/);
      const newLines = incomingLines.filter(l => l.trim() && !existingLines.has(l.trim()));

      if (newLines.length > 0) {
        fs.appendFileSync(destPath, `\n\n# --- Imported Memory (${new Date().toISOString().substring(0, 10)}) ---\n` + newLines.join('\n') + '\n', 'utf8');
      }
    } else {
      fs.writeFileSync(destPath, content, 'utf8');
    }
    count++;
  }

  console.log(`${c.green}📥 [Imported]${c.reset} ${count} memory documents merged into: ${c.bold}${memDir}${c.reset}`);
  return count;
}

module.exports = {
  exportMemory,
  importMemory,
};
