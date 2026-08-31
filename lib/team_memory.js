'use strict';

const fs = require('fs');
const path = require('path');
const { c } = require('./constants');

const DEFAULT_TEAM_FILES = {
  'team_memory.md': `# Workspace Team Memory & Standards

## Shared Architecture & Design Principles
- Keep domain boundaries modular with explicit interfaces.
- Prefer composable utility functions over deeply nested inheritance.
- Always include automated unit and integration tests for new endpoints.

## API & Database Conventions
- Use standard REST / GraphQL / gRPC naming conventions.
- All timestamps must be stored in UTC format.
- Add database indexes to foreign keys and high-cardinality search columns.
`,
  'architecture_decisions.md': `# Architecture Decision Records (ADRs)

## ADR-001: Sovereign AI Engineering Standards
- **Date:** ${new Date().toISOString().substring(0, 10)}
- **Status:** Accepted
- **Context:** Standardizing AI coding agent behavior, persistent memory, and deterministic verification invariants across the entire engineering team.
- **Decision:** Adopt OpenGuild 12-Expert Council and pre-commit verification invariants.
- **Consequences:** Consistent, self-documenting code with zero regression proofs.
`,
};

/**
 * Initialize or inspect workspace team memory in `.openguild/`.
 *
 * @param {string} projectDir - Workspace directory.
 * @returns {object} { path: string, created: boolean }
 */
function initTeamMemory(projectDir = process.cwd()) {
  const teamDir = path.join(projectDir, '.openguild');
  const alreadyExists = fs.existsSync(teamDir);

  if (!alreadyExists) {
    fs.mkdirSync(teamDir, { recursive: true });

    for (const [filename, content] of Object.entries(DEFAULT_TEAM_FILES)) {
      const filePath = path.join(teamDir, filename);
      fs.writeFileSync(filePath, content, 'utf8');
    }

    console.log(`${c.green}✨ [Created]${c.reset} Team Memory Vault at: ${c.dim}${teamDir}${c.reset}`);
    console.log(`   Committed to Git so all teammates share project memory automatically.`);
    return { path: teamDir, created: true };
  } else {
    console.log(`${c.cyan}👥 [Connected]${c.reset} Team Memory Vault at: ${c.dim}${teamDir}${c.reset}`);
    return { path: teamDir, created: false };
  }
}

module.exports = {
  DEFAULT_TEAM_FILES,
  initTeamMemory,
};
