'use strict';

const fs = require('fs');
const path = require('path');
const { tokenize } = require('./hybrid_search');

// Explicit semantic transition patterns: captures { from, to }
const TRANSITION_PATTERNS = [
  /(?:migrated|migrating)\s+from\s+([A-Za-z0-9_.-]+)\s+to\s+([A-Za-z0-9_.-]+)/i,
  /(?:switched|switching)\s+from\s+([A-Za-z0-9_.-]+)\s+to\s+([A-Za-z0-9_.-]+)/i,
  /(?:replaced|replacing)\s+([A-Za-z0-9_.-]+)\s+with\s+([A-Za-z0-9_.-]+)/i,
  /deprecated\s+([A-Za-z0-9_.-]+)\s+in\s+favor\s+of\s+([A-Za-z0-9_.-]+)/i,
  /no\s+longer\s+use\s+([A-Za-z0-9_.-]+)/i,
  /adopt\s+([A-Za-z0-9_.-]+)\s+over\s+([A-Za-z0-9_.-]+)/i,
  /prefer\s+([A-Za-z0-9_.-]+)\s+over\s+([A-Za-z0-9_.-]+)/i,
  /instead\s+of\s+([A-Za-z0-9_.-]+),?\s+use\s+([A-Za-z0-9_.-]+)/i,
];

// Mutually exclusive tech paradigms that should trigger a conflict alert if both are recommended
const OPPOSING_PARADIGMS = [
  ['jest', 'vitest'],
  ['mocha', 'vitest'],
  ['webpack', 'vite'],
  ['redux', 'zustand'],
  ['rest', 'graphql'],
  ['npm', 'pnpm'],
  ['yarn', 'pnpm'],
  ['oauth1', 'oauth2'],
  ['javascript', 'typescript'],
];

/**
 * Detect if a newly proposed memory entry contradicts or supersedes existing entries.
 *
 * @param {string} newText - The new rule or lesson.
 * @param {Array<object>} existingEntries - [{ line, text, file, lineNum }]
 * @returns {object} { hasConflict, conflicts: [{ oldEntry, reason, supersededTarget }] }
 */
function detectContradictions(newText, existingEntries = []) {
  const conflicts = [];
  const normalizedNew = newText.trim().toLowerCase();

  // 1. Check explicit transition patterns
  for (const pattern of TRANSITION_PATTERNS) {
    const match = newText.match(pattern);
    if (match) {
      const fromTerm = match[1] ? match[1].toLowerCase() : null;
      const toTerm = match[2] ? match[2].toLowerCase() : null;

      if (fromTerm) {
        for (const entry of existingEntries) {
          if (entry.text.includes('[SUPERSEDED]')) continue;
          const entryNorm = entry.text.toLowerCase();

          // If old entry advocates the deprecated term and does not mention the new term
          if (entryNorm.includes(fromTerm) && (!toTerm || !entryNorm.includes(toTerm))) {
            conflicts.push({
              oldEntry: entry,
              reason: `Explicit migration detected: "${match[0]}" supersedes older rule.`,
              supersededTarget: fromTerm,
            });
          }
        }
      }
    }
  }

  // 2. Check opposing technology paradigms
  const newTokens = new Set(tokenize(normalizedNew));
  for (const [techA, techB] of OPPOSING_PARADIGMS) {
    if (newTokens.has(techB) && !newTokens.has(techA)) {
      for (const entry of existingEntries) {
        if (entry.text.includes('[SUPERSEDED]')) continue;
        const entryTokens = new Set(tokenize(entry.text.toLowerCase()));

        if (entryTokens.has(techA) && !entryTokens.has(techB)) {
          // Both are stated affirmatively
          if (!conflicts.some(c => c.oldEntry.lineNum === entry.lineNum && c.oldEntry.file === entry.file)) {
            conflicts.push({
              oldEntry: entry,
              reason: `Technology paradigm clash: Newer rule adopts "${techB}" over "${techA}".`,
              supersededTarget: techA,
            });
          }
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Format a line to mark it as superseded while preserving history.
 */
function markLineSuperseded(line, reason = '') {
  const trimmed = line.trim();
  if (trimmed.includes('[SUPERSEDED]')) return line;

  const note = reason ? ` (Reason: ${reason})` : '';
  if (trimmed.startsWith('-')) {
    return `- [SUPERSEDED] ${trimmed.substring(1).trim()}${note}`;
  }
  return `[SUPERSEDED] ${trimmed}${note}`;
}

/**
 * Scan a memory vault directory and resolve conflicts/superseded lines.
 *
 * @param {string} vaultDir - Directory containing markdown memory files.
 * @param {object} options - { dryRun, autoFix }
 * @returns {object} { vaultDir, resolvedCount, updates }
 */
function resolveVaultConflicts(vaultDir, options = {}) {
  const dryRun = options.dryRun || false;
  const updates = [];

  if (!fs.existsSync(vaultDir)) {
    return { vaultDir, resolvedCount: 0, updates: [] };
  }

  const files = fs.readdirSync(vaultDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(vaultDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    const existingEntries = lines.map((line, idx) => ({
      line,
      text: line.trim(),
      file,
      lineNum: idx + 1,
    })).filter(e => e.text.startsWith('-') || e.text.startsWith('*'));

    let fileModified = false;
    const newLines = [...lines];

    // Check each line against subsequent lines
    for (let i = 0; i < existingEntries.length; i++) {
      const current = existingEntries[i];
      // Compare with lines added after it
      for (let j = i + 1; j < existingEntries.length; j++) {
        const newer = existingEntries[j];
        const res = detectContradictions(newer.text, [current]);
        if (res.hasConflict) {
          const targetConflict = res.conflicts[0];
          const originalLineIdx = current.lineNum - 1;
          const updatedLine = markLineSuperseded(newLines[originalLineIdx], targetConflict.reason);

          if (updatedLine !== newLines[originalLineIdx]) {
            newLines[originalLineIdx] = updatedLine;
            fileModified = true;
            updates.push({
              file,
              lineNum: current.lineNum,
              oldText: current.text,
              newText: updatedLine,
              reason: targetConflict.reason,
            });
          }
        }
      }
    }

    if (fileModified && !dryRun) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    }
  }

  return {
    vaultDir,
    resolvedCount: updates.length,
    updates,
  };
}

/**
 * Resolve conflicts across global and team memory vaults.
 *
 * @param {Array<string>} vaultDirs - Array of directory paths.
 * @param {object} options - { dryRun }
 * @returns {object} { totalResolved, reports }
 */
function resolveAllVaultConflicts(vaultDirs, options = {}) {
  const reports = [];
  let totalResolved = 0;

  for (const dir of vaultDirs) {
    if (fs.existsSync(dir)) {
      const res = resolveVaultConflicts(dir, options);
      totalResolved += res.resolvedCount;
      reports.push(res);
    }
  }

  let markdown = `# 🛡️ Memory Conflict & Evolution Audit\n\n`;
  if (totalResolved === 0) {
    markdown += `✨ All memory vaults are consistent. No conflicting or superseded rules found.\n`;
  } else {
    markdown += `Resolved **${totalResolved}** superseded rules across memory vaults:\n\n`;
    for (const r of reports) {
      if (r.updates.length > 0) {
        markdown += `### 📁 Vault: \`${r.vaultDir}\`\n`;
        for (const u of r.updates) {
          markdown += `- **${u.file}:${u.lineNum}** ${u.reason}\n`;
          markdown += `  - *Old:* \`${u.oldText}\`\n`;
          markdown += `  - *New:* \`${u.newText}\`\n\n`;
        }
      }
    }
  }

  return {
    totalResolved,
    reports,
    markdown: markdown.trim(),
  };
}

module.exports = {
  TRANSITION_PATTERNS,
  OPPOSING_PARADIGMS,
  detectContradictions,
  markLineSuperseded,
  resolveVaultConflicts,
  resolveAllVaultConflicts,
};
