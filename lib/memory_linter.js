'use strict';

const fs = require('fs');
const path = require('path');
const { c } = require('./constants');
const { getGlobalMemoryPath } = require('./memory');

/**
 * Lint and optionally fix a single markdown memory file.
 *
 * @param {string} filePath - Path to markdown file.
 * @param {boolean} fix - If true, writes deduplicated content back to disk.
 * @returns {object} { file: string, duplicates: number, totalLines: number, fixed: boolean }
 */
function lintMemoryFile(filePath, fix = false) {
  if (!fs.existsSync(filePath)) {
    return { file: path.basename(filePath), duplicates: 0, totalLines: 0, fixed: false };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const seenLines = new Set();
  const cleanLines = [];
  let duplicates = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if line is a duplicate bullet point or rule
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      const normalized = trimmed.toLowerCase().replace(/^[-*\d.]+\s*/, '').trim();
      if (seenLines.has(normalized)) {
        duplicates++;
        continue; // Skip duplicate in cleanLines
      }
      seenLines.add(normalized);
    }

    cleanLines.push(line);
  }

  if (fix && duplicates > 0) {
    fs.writeFileSync(filePath, cleanLines.join('\n') + '\n', 'utf8');
  }

  return {
    file: path.basename(filePath),
    duplicates,
    totalLines: lines.length,
    fixed: fix && duplicates > 0,
  };
}

/**
 * Scan all global memory files and project team memory files.
 *
 * @param {string} projectDir - Workspace directory.
 * @param {boolean} fix - Whether to auto-deduplicate.
 * @returns {object[]} Array of lint reports.
 */
function lintAllMemory(projectDir = process.cwd(), fix = false) {
  const globalMemDir = getGlobalMemoryPath();
  const teamMemDir = path.join(projectDir, '.openguild');

  const targetDirs = [
    { label: 'Global Memory (~/.openguild/memory)', dir: globalMemDir },
    { label: 'Team Memory (.openguild)', dir: teamMemDir },
  ];

  console.log(`\n${c.cyan}${c.bold}🧹 OpenGuild Memory Vault Linter${c.reset}`);
  if (fix) console.log(`${c.green}🔧 [Autofix Enabled] Deduplicating and optimizing memory documents.${c.reset}`);

  const results = [];
  let totalDups = 0;

  for (const target of targetDirs) {
    if (!fs.existsSync(target.dir)) continue;

    console.log(`\n${c.bold}Inspecting ${target.label}:${c.reset}`);
    const files = fs.readdirSync(target.dir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const fullPath = path.join(target.dir, file);
      if (!fs.statSync(fullPath).isFile()) continue;

      const report = lintMemoryFile(fullPath, fix);
      results.push(report);
      totalDups += report.duplicates;

      if (report.duplicates > 0) {
        const action = fix ? `${c.green}✔ Fixed (${report.duplicates} removed)${c.reset}` : `${c.yellow}⚠ Found ${report.duplicates} duplicates${c.reset}`;
        console.log(`  📄 ${c.bold}${report.file.padEnd(28)}${c.reset} — ${action}`);
      } else {
        console.log(`  📄 ${c.bold}${report.file.padEnd(28)}${c.reset} — ${c.green}✔ Clean (${report.totalLines} lines)${c.reset}`);
      }
    }
  }

  console.log(`\n${totalDups === 0 ? c.green : c.yellow}${c.bold}Audit Summary:${c.reset} ${totalDups === 0 ? '✨ All memory documents are clean and optimized!' : `Found ${totalDups} duplicate rules across memory vault.`}\n`);

  return results;
}

module.exports = {
  lintMemoryFile,
  lintAllMemory,
};
