/**
 * OmniGuild Aider-Style Search-and-Replace Diff Engine & Rollback
 *
 * Implements surgical search-and-replace block parsing and application,
 * avoiding monolithic full-file rewrites, and safe git checkpoint rollback.
 *
 * Pure Node.js built-ins. Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Parses search-and-replace blocks from patch text.
 * @param {string} patchText
 * @returns {Array<{ search: string, replace: string, file?: string }>}
 */
function parseSearchReplaceBlocks(patchText = '') {
  const blocks = [];
  const lines = patchText.split(/\r?\n/);

  let currentFile = null;
  let inSearch = false;
  let inReplace = false;
  let searchLines = [];
  let replaceLines = [];

  for (const line of lines) {
    // Detect file header: e.g. "### lib/auth.js" or "--- a/lib/auth.js"
    const fileMatch = line.match(/^(?:###|---|\+\+\+|File:|TargetFile:)\s*(?:[ab]\/)?([^\s]+)/i);
    if (fileMatch) {
      currentFile = fileMatch[1].trim();
      continue;
    }

    if (line.includes('<<<<<<< SEARCH')) {
      inSearch = true;
      inReplace = false;
      searchLines = [];
      continue;
    }

    if (line.includes('=======') && inSearch) {
      inSearch = false;
      inReplace = true;
      replaceLines = [];
      continue;
    }

    if (line.includes('>>>>>>> REPLACE') && inReplace) {
      inReplace = false;
      blocks.push({
        file: currentFile,
        search: searchLines.join('\n'),
        replace: replaceLines.join('\n')
      });
      searchLines = [];
      replaceLines = [];
      continue;
    }

    if (inSearch) {
      searchLines.push(line);
    } else if (inReplace) {
      replaceLines.push(line);
    }
  }

  return blocks;
}

/**
 * Applies a single search-and-replace block to source code.
 * @param {string} sourceCode
 * @param {string} searchStr
 * @param {string} replaceStr
 * @returns {{ success: boolean, newCode: string }}
 */
function applySingleBlock(sourceCode, searchStr, replaceStr) {
  // 1. Try exact match
  if (sourceCode.includes(searchStr)) {
    return {
      success: true,
      newCode: sourceCode.replace(searchStr, replaceStr)
    };
  }

  // 2. Try normalized CRLF match
  const normSource = sourceCode.replace(/\r\n/g, '\n');
  const normSearch = searchStr.replace(/\r\n/g, '\n');
  const normReplace = replaceStr.replace(/\r\n/g, '\n');

  if (normSource.includes(normSearch)) {
    return {
      success: true,
      newCode: normSource.replace(normSearch, normReplace)
    };
  }

  return { success: false, newCode: sourceCode };
}

/**
 * Applies search-replace patch to target file or files.
 * @param {string} patchText
 * @param {string} [defaultFile]
 * @param {string} [cwd]
 * @returns {{ appliedCount: number, totalBlocks: number, modifiedFiles: string[] }}
 */
function applyPatch(patchText, defaultFile = null, cwd = process.cwd()) {
  let targetDefault = defaultFile;
  let workingDir = cwd;
  if (typeof defaultFile === 'object' && defaultFile !== null) {
    targetDefault = defaultFile.defaultFile || null;
    workingDir = defaultFile.cwd || process.cwd();
  }

  const blocks = parseSearchReplaceBlocks(patchText);
  if (blocks.length === 0) {
    return { success: false, appliedCount: 0, totalBlocks: 0, modifiedFiles: [], error: 'No search/replace blocks found in patch' };
  }

  const modifiedFiles = new Set();
  let appliedCount = 0;

  for (const block of blocks) {
    const targetRelPath = block.file || targetDefault;
    if (!targetRelPath) continue;

    const absPath = path.isAbsolute(targetRelPath) ? targetRelPath : path.join(workingDir, targetRelPath);
    if (!fs.existsSync(absPath)) continue;

    const original = fs.readFileSync(absPath, 'utf8');
    const result = applySingleBlock(original, block.search, block.replace);

    if (result.success) {
      fs.writeFileSync(absPath, result.newCode, 'utf8');
      appliedCount++;
      modifiedFiles.add(targetRelPath);
    }
  }

  return {
    success: appliedCount > 0,
    appliedCount,
    totalBlocks: blocks.length,
    modifiedFiles: Array.from(modifiedFiles),
    error: appliedCount === 0 ? 'No blocks could be matched' : (appliedCount < blocks.length ? 'Some blocks could not be matched' : null)
  };
}

/**
 * Reverts the most recent working tree changes (Aider-style 1-click /undo).
 * Safely reverts tracked file modifications without deleting untracked files.
 * @param {string} cwd
 * @param {object} [options]
 * @param {boolean} [options.cleanUntracked=false]
 * @returns {{ success: boolean, message: string }}
 */
function rollbackLastCheckpoint(cwd = process.cwd(), options = {}) {
  let workingDir = cwd;
  let opts = options;
  if (typeof cwd === 'object' && cwd !== null) {
    workingDir = cwd.cwd || process.cwd();
    opts = cwd;
  }

  try {
    // Check if there are uncommitted working tree changes
    const status = execSync('git status --porcelain', { cwd: workingDir, encoding: 'utf8' }).trim();
    if (status) {
      execSync('git checkout .', { cwd: workingDir, stdio: ['pipe', 'pipe', 'ignore'] });
      if (opts.cleanUntracked) {
        execSync('git clean -fd', { cwd: workingDir, stdio: ['pipe', 'pipe', 'ignore'] });
      }
      return {
        success: true,
        message: '⏪ [Rollback Successful] Reverted tracked file modifications.'
      };
    }

    // Otherwise, rollback the latest commit if it was created by OmniGuild
    const lastCommit = execSync('git log -1 --pretty=%B', { cwd: workingDir, encoding: 'utf8' }).trim();
    if (lastCommit.includes('OmniGuild') || lastCommit.includes('feat') || lastCommit.includes('fix')) {
      execSync('git reset --soft HEAD~1', { cwd: workingDir, stdio: ['pipe', 'pipe', 'ignore'] });
      return {
        success: true,
        message: `⏪ [Rollback Successful] Soft-reset last commit: "${lastCommit.split('\n')[0]}".`
      };
    }

    return {
      success: true,
      message: 'Workspace is clean. Nothing to undo.'
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to rollback: ${err.message}`,
      message: `Failed to rollback: ${err.message}`
    };
  }
}

module.exports = {
  parseSearchReplaceBlocks,
  applySingleBlock,
  applyPatch,
  rollbackLastCheckpoint
};
