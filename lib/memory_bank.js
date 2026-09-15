'use strict';

const fs = require('fs');
const path = require('path');
const { c } = require('./constants');

const MEMORY_BANK_FILES = {
  'active_task.md': `# 🎯 Active Task & Living Context

- **Current Goal:** Initialize project architecture and standards
- **Status:** in_progress
- **Last Updated:** ${new Date().toISOString()}

## 🔒 Constraints & User Preferences
- Zero external runtime dependencies; maintain pure Node.js architecture.
- Enforce deterministic test invariants before completing features.

## 📋 Next Steps
- [ ] Maintain living active task context during pair programming sessions
- [ ] Auto-commit architectural decisions to version-controlled team memory

## 📝 Active Session Notes
- OpenGuild Living Memory Bank initialized.
`,

  'system_patterns.md': `# 🏛️ System Patterns & Architecture

## 1. Domain Boundaries & Design Principles
- Single-responsibility modules with explicit function exports.
- Zero-dependency philosophy for high speed, portability, and zero security supply-chain attack surface.
- Strict input sanitization and secret scrubbing before persisting any data.

## 2. Invariant Verification Loop
- Automated test suites must pass before any pull request or task completion.
- Linters and typechecks run as non-blocking or blocking pre-commit gates.
`,

  'decision_log.md': `# 📜 Living Decision Log (ADRs)

## ADR-001: Sovereign Living Memory Bank
- **Date:** ${new Date().toISOString().substring(0, 10)}
- **Status:** Accepted
- **Context:** AI coding agents frequently experience session amnesia across chat turns, losing track of the active task, architectural constraints, and next steps.
- **Decision:** Establish a version-controlled living memory bank in \`.openguild/\` with structured files (\`active_task.md\`, \`system_patterns.md\`, \`decision_log.md\`).
- **Consequences:** Autonomous task continuity across chat windows and team-wide architectural alignment.
`,
};

/**
 * Initialize or scaffold the living memory bank in `.openguild/`.
 */
function initMemoryBank(projectDir = process.cwd(), dryRun = false) {
  const teamDir = path.join(projectDir, '.openguild');

  if (!dryRun && !fs.existsSync(teamDir)) {
    fs.mkdirSync(teamDir, { recursive: true });
  }

  const createdFiles = [];
  const existingFiles = [];

  for (const [filename, content] of Object.entries(MEMORY_BANK_FILES)) {
    const filePath = path.join(teamDir, filename);
    if (!fs.existsSync(filePath)) {
      if (!dryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
      createdFiles.push(filename);
    } else {
      existingFiles.push(filename);
    }
  }

  return {
    dir: teamDir,
    createdFiles,
    existingFiles,
  };
}

/**
 * Read memory bank files from `.openguild/`.
 *
 * @param {string} projectDir - Workspace root.
 * @param {string} specificFile - Optional file name (e.g. "active_task.md").
 * @returns {object} { file, content, exists }
 */
function readMemoryBank(projectDir = process.cwd(), specificFile = null) {
  const teamDir = path.join(projectDir, '.openguild');

  if (!fs.existsSync(teamDir)) {
    return {
      exists: false,
      text: `Memory bank is not initialized. Run \`npx antigravity-guild --team\` to initialize.`,
    };
  }

  if (specificFile) {
    const filePath = path.join(teamDir, path.basename(specificFile));
    if (fs.existsSync(filePath)) {
      return {
        exists: true,
        text: fs.readFileSync(filePath, 'utf8'),
      };
    }
    return {
      exists: false,
      text: `File "${specificFile}" not found in living memory bank.`,
    };
  }

  let aggregated = `# 🧠 Living Memory Bank: ${path.basename(projectDir)}\n\n`;
  const files = ['active_task.md', 'system_patterns.md', 'decision_log.md', 'team_memory.md', 'architecture_decisions.md'];

  for (const f of files) {
    const filePath = path.join(teamDir, f);
    if (fs.existsSync(filePath)) {
      aggregated += `## 📄 \`${f}\`\n\n${fs.readFileSync(filePath, 'utf8')}\n\n---\n\n`;
    }
  }

  return {
    exists: true,
    text: aggregated.trim(),
  };
}

/**
 * Surgically update the active task in `.openguild/active_task.md`.
 *
 * @param {string} projectDir - Workspace directory.
 * @param {object} updates - { goal, status, constraints, nextSteps, notes }
 * @returns {object} { success: boolean, updatedContent: string, message: string }
 */
function updateActiveTask(projectDir = process.cwd(), updates = {}) {
  const teamDir = path.join(projectDir, '.openguild');
  if (!fs.existsSync(teamDir)) {
    fs.mkdirSync(teamDir, { recursive: true });
  }

  const activeTaskPath = path.join(teamDir, 'active_task.md');
  const now = new Date().toISOString();

  let existing = '';
  if (fs.existsSync(activeTaskPath)) {
    existing = fs.readFileSync(activeTaskPath, 'utf8');
  }

  // Parse existing fields if not provided
  let goal = updates.goal || updates.task;
  let status = updates.status || 'in_progress';
  let constraints = updates.constraints;
  let nextSteps = updates.nextSteps;
  let notes = updates.notes;

  if (!goal) {
    const goalMatch = existing.match(/\*\*Current Goal:\*\*\s*(.+)/);
    goal = goalMatch ? goalMatch[1].trim() : 'Active engineering task';
  }

  if (!status) {
    const statusMatch = existing.match(/\*\*Status:\*\*\s*(.+)/);
    status = statusMatch ? statusMatch[1].trim() : 'in_progress';
  }

  let formattedSteps = '';
  if (Array.isArray(nextSteps)) {
    formattedSteps = nextSteps.map(s => s.startsWith('-') ? s : `- [ ] ${s}`).join('\n');
  } else if (typeof nextSteps === 'string' && nextSteps.trim()) {
    formattedSteps = nextSteps.trim();
  } else {
    // Preserve existing next steps if present
    const stepsMatch = existing.match(/## 📋 Next Steps\n([\s\S]*?)(?=\n##|$)/);
    formattedSteps = stepsMatch ? stepsMatch[1].trim() : '- [ ] Continue development';
  }

  let formattedConstraints = '';
  if (constraints) {
    formattedConstraints = Array.isArray(constraints)
      ? constraints.map(c => `- ${c}`).join('\n')
      : constraints.trim();
  } else {
    const constrMatch = existing.match(/## 🔒 Constraints & User Preferences\n([\s\S]*?)(?=\n##|$)/);
    formattedConstraints = constrMatch ? constrMatch[1].trim() : '- Follow clean code and deterministic verification invariants.';
  }

  let formattedNotes = '';
  if (notes) {
    const newNote = `- [${now.substring(0, 10)}] ${notes.trim()}`;
    const notesMatch = existing.match(/## 📝 Active Session Notes\n([\s\S]*?)(?=\n##|$)/);
    const existingNotes = notesMatch ? notesMatch[1].trim() : '';
    formattedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
  } else {
    const notesMatch = existing.match(/## 📝 Active Session Notes\n([\s\S]*?)(?=\n##|$)/);
    formattedNotes = notesMatch ? notesMatch[1].trim() : `- [${now.substring(0, 10)}] Task updated.`;
  }

  const newContent = `# 🎯 Active Task & Living Context

- **Current Goal:** ${goal}
- **Status:** ${status}
- **Last Updated:** ${now}

## 🔒 Constraints & User Preferences
${formattedConstraints}

## 📋 Next Steps
${formattedSteps}

## 📝 Active Session Notes
${formattedNotes}
`;

  fs.writeFileSync(activeTaskPath, newContent, 'utf8');

  return {
    success: true,
    updatedContent: newContent,
    message: `Active task updated successfully (${status}).`,
  };
}

module.exports = {
  MEMORY_BANK_FILES,
  initMemoryBank,
  readMemoryBank,
  updateActiveTask,
};
