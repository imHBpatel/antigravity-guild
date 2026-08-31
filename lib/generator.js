'use strict';

const fs = require('fs');
const path = require('path');
const { COUNCIL_MEMBERS, PRESETS, c } = require('./constants');

/**
 * Generate standard OpenGuild rule content with selected Council roles and Invariants.
 *
 * @param {string} name - Project / Workspace name.
 * @param {string} memPath - Absolute path to global memory hub.
 * @param {object} stack - Detected stack metadata.
 * @param {string} presetKey - Domain preset ('full', 'backend', 'web', 'mobile', 'ai-ml').
 * @param {string} teamMemPath - Optional workspace team memory path.
 * @returns {string} Markdown rule specification.
 */
function buildRuleContent(name, memPath, stack, presetKey = 'full', teamMemPath = null) {
  const preset = PRESETS[presetKey] || PRESETS.full;
  const activeMembers = COUNCIL_MEMBERS.filter(m => preset.roles.includes(m.id));

  const monorepoNotice = stack.isMonorepo
    ? `\n- **Monorepo Topology:** Detected ${stack.monorepoTool}. Coordinate cross-package invariants and package isolation.`
    : '';

  const teamMemoryNotice = teamMemPath
    ? `\n- **Workspace Team Memory:** \`${teamMemPath}\` (review \`team_memory.md\` and \`architecture_decisions.md\`).`
    : '';

  let councilList = '';
  for (const m of activeMembers) {
    councilList += `- ${m.icon} **${m.title}**: ${m.domain}\n`;
  }

  return `# Sovereign AI Engineering Guild: ${name}

## 1. Global Brain Connection
- **Global Memory Path:** \`${memPath}\`
- Always review and apply lessons from \`institutional_memory.md\` and \`security_standards.md\` before designing or modifying architecture.${teamMemoryNotice}${monorepoNotice}

## 2. Multi-Role Expert Council (${preset.name})
When assisting on this project, operate as the **${activeMembers.length}-Expert Council**:

${councilList.trim()}

## 3. Deterministic Verification Invariants
Before marking any task or feature as complete, execute:
- **Test Suite:** \`${stack.testCmd}\`
- **Linter:** \`${stack.lintCmd}\`
- **Typecheck:** \`${stack.typecheckCmd}\`

> [!IMPORTANT]
> Never report tasks as complete if automated tests, linters, or typechecks fail.

## 4. Constitutional & SAIF Security Safeguards
- **Zero Secret Exposure:** Never output, log, or commit private keys, API secrets, or \`.env\` values.
- **Destructive Operation Gate:** Always request explicit user confirmation before executing irreversible commands (e.g. \`DROP TABLE\`, destructive SQL updates, force-pushing git branches, or deleting cloud resources).
- **Graceful Error Handling:** Explicitly handle edge cases and network failures — never swallow errors silently.
- **Performance & Latency Hygiene:** Optimize database queries, eliminate N+1 patterns, and avoid unnecessary in-memory allocations.

## 5. Code Quality Standards
- Write self-documenting code with clear, idiomatic naming conventions.
- Every complex code block must include a comment explaining *why*, not just *what*.
- Preserve modular file structures and prevent bloated single-file monolithic anti-patterns.
`;
}

/**
 * Non-destructive rule merge helper.
 * If the file contains existing custom developer rules outside of the OpenGuild
 * managed sections, preserves the custom rules while updating OpenGuild standards.
 *
 * @param {string} existing - Current file content.
 * @param {string} generated - Newly generated rule content.
 * @returns {string} Merged content.
 */
function mergeRuleContent(existing, generated) {
  if (!existing || !existing.trim()) {
    return generated;
  }

  // If already matches, return as is
  if (existing.trim() === generated.trim()) {
    return existing;
  }

  // Check if there are custom developer sections (e.g., custom user rules)
  const customSectionHeader = '## Custom Workspace Rules';
  if (existing.includes(customSectionHeader)) {
    const customContent = existing.substring(existing.indexOf(customSectionHeader));
    return `${generated.trim()}\n\n${customContent.trim()}\n`;
  }

  return generated;
}

/**
 * Synthesizes all AI agent rule files (.gemini/rules.md, AGENTS.md, .cursorrules).
 *
 * @param {string} projectDir - Workspace root path.
 * @param {string} projectName - Project name.
 * @param {string} memPath - Global memory path.
 * @param {object} stack - Stack metadata.
 * @param {string} presetKey - Domain preset.
 * @param {boolean} dryRun - If true, previews output without writing to disk.
 * @returns {object} Results of written files.
 */
function synthesizeContracts(projectDir, projectName, memPath, stack, presetKey = 'full', dryRun = false) {
  const teamMemDir = path.join(projectDir, '.openguild');
  const teamMemPath = fs.existsSync(teamMemDir) ? teamMemDir : null;

  const generatedRule = buildRuleContent(projectName, memPath, stack, presetKey, teamMemPath);
  const geminiDir = path.join(projectDir, '.gemini');
  const targetFiles = [
    { dir: geminiDir, name: 'rules.md', label: 'Antigravity IDE / Gemini (.gemini/rules.md)' },
    { dir: projectDir, name: 'AGENTS.md', label: 'Universal Agent Standard (AGENTS.md)' },
    { dir: projectDir, name: '.cursorrules', label: 'Cursor IDE Contract (.cursorrules)' },
  ];

  const results = [];

  for (const target of targetFiles) {
    const fullPath = path.join(target.dir, target.name);
    let existingContent = '';
    if (fs.existsSync(fullPath)) {
      try {
        existingContent = fs.readFileSync(fullPath, 'utf8');
      } catch { /* ignore */ }
    }

    const finalContent = mergeRuleContent(existingContent, generatedRule);

    if (!dryRun) {
      if (!fs.existsSync(target.dir)) {
        fs.mkdirSync(target.dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, finalContent, 'utf8');
    }

    results.push({
      path: fullPath,
      label: target.label,
      updated: existingContent.length > 0,
      content: finalContent
    });
  }

  return results;
}

module.exports = {
  buildRuleContent,
  mergeRuleContent,
  synthesizeContracts,
};
