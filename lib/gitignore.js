'use strict';

const fs = require('fs');
const path = require('path');
const { c } = require('./constants');

const CONTEXT_HYGIENE_ENTRIES = [
  '# === OpenGuild Context Hygiene ===',
  'node_modules/',
  '.venv/',
  'venv/',
  'env/',
  '__pycache__/',
  '*.pyc',
  '.pytest_cache/',
  '.mypy_cache/',
  '.ruff_cache/',
  'dist/',
  'build/',
  'out/',
  'target/',
  '.next/',
  '.nuxt/',
  '.svelte-kit/',
  '.turbo/',
  '.nx/',
  '*.log',
  '.env',
  '.env.*',
  '*.key',
  '*.pem',
  '.DS_Store',
  'Thumbs.db'
];

/**
 * Ensures context hygiene exclusions are present in the project's .gitignore.
 * Guaranteed to be idempotent (will not create duplicate entries).
 *
 * @param {string} projectDir - Workspace root path.
 * @param {boolean} dryRun - If true, checks without writing.
 * @returns {object} { updated: boolean, created: boolean, addedCount: number }
 */
function enforceGitignore(projectDir, dryRun = false) {
  const gitignorePath = path.join(projectDir, '.gitignore');
  const exists = fs.existsSync(gitignorePath);

  if (!exists) {
    const content = CONTEXT_HYGIENE_ENTRIES.join('\n') + '\n';
    if (!dryRun) {
      fs.writeFileSync(gitignorePath, content, 'utf8');
    }
    return { updated: false, created: true, addedCount: CONTEXT_HYGIENE_ENTRIES.length };
  }

  const existingContent = fs.readFileSync(gitignorePath, 'utf8');
  const existingLines = new Set(existingContent.split(/\r?\n/).map(l => l.trim()));

  const missingEntries = CONTEXT_HYGIENE_ENTRIES.filter(entry => {
    const trimmed = entry.trim();
    if (!trimmed || trimmed.startsWith('#')) return false;
    return !existingLines.has(trimmed);
  });

  if (missingEntries.length > 0) {
    const appendBlock = '\n# === OpenGuild Context Hygiene ===\n' + missingEntries.join('\n') + '\n';
    if (!dryRun) {
      fs.appendFileSync(gitignorePath, appendBlock, 'utf8');
    }
    return { updated: true, created: false, addedCount: missingEntries.length };
  }

  return { updated: false, created: false, addedCount: 0 };
}

module.exports = {
  CONTEXT_HYGIENE_ENTRIES,
  enforceGitignore,
};
