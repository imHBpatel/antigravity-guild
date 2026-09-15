'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  detectContradictions,
  markLineSuperseded,
  resolveVaultConflicts,
  resolveAllVaultConflicts,
} = require('../lib/conflict_resolver');
const { recordLesson } = require('../lib/learn');

console.log('🧪 Running Memory Conflict & Evolution Tests...');

// 1. Contradiction Detection (Explicit Transitions & Opposing Paradigms)
{
  const existing = [
    { text: '- [2026-01-01] Always use Jest for unit testing React components', file: 'institutional_memory.md', lineNum: 5 },
    { text: '- [2026-01-02] Use standard REST endpoints for CRUD operations', file: 'institutional_memory.md', lineNum: 6 },
  ];

  // Explicit migration
  const res1 = detectContradictions('Migrated from Jest to Vitest across all repositories', existing);
  assert(res1.hasConflict, 'Expected conflict for Jest migration');
  assert.strictEqual(res1.conflicts.length, 1);
  assert(res1.conflicts[0].reason.includes('supersedes'));

  // Opposing tech paradigm
  const res2 = detectContradictions('Adopt vitest for all new test suites', existing);
  assert(res2.hasConflict, 'Expected paradigm conflict between Jest and Vitest');

  // No conflict
  const res3 = detectContradictions('Always validate incoming requests with zod', existing);
  assert(!res3.hasConflict, 'Zod should not conflict with existing entries');

  console.log('  ✔ detectContradictions verified across migration patterns & opposing paradigms');
}

// 2. Line Superseding Format
{
  const original = '- [2026-01-01] Always use Jest for unit testing';
  const superseded = markLineSuperseded(original, 'Migrated to Vitest');
  assert(superseded.startsWith('- [SUPERSEDED]'));
  assert(superseded.includes('Always use Jest'));
  assert(superseded.includes('Migrated to Vitest'));

  // Idempotency: should not double-supersede
  const second = markLineSuperseded(superseded, 'Another reason');
  assert.strictEqual(second, superseded);

  console.log('  ✔ markLineSuperseded formatting & idempotency verified');
}

// 3. Vault Conflict Resolution on Disk
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-conflict-'));

  try {
    const memoryFile = path.join(tmpDir, 'team_memory.md');
    fs.writeFileSync(memoryFile, `# Team Standards
- [2026-01-01] Always use Webpack for asset bundling
- [2026-02-01] Switched from Webpack to Vite for 10x faster HMR
`);

    const res = resolveVaultConflicts(tmpDir, { dryRun: false });
    assert.strictEqual(res.resolvedCount, 1, 'Expected 1 resolved conflict');

    const updatedContent = fs.readFileSync(memoryFile, 'utf8');
    assert(updatedContent.includes('[SUPERSEDED]'));
    assert(updatedContent.includes('Always use Webpack'));
    assert(updatedContent.includes('Switched from Webpack to Vite'));

    console.log('  ✔ resolveVaultConflicts on-disk resolution verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 4. Autonomous recordLesson Conflict Resolution Integration
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-learn-conflict-'));

  try {
    // Record initial lesson
    recordLesson('Use OAuth1 for mobile authentication', {
      scope: 'team',
      projectDir: tmpDir,
    });

    // Record superseding lesson
    const res = recordLesson('Migrated from OAuth1 to OAuth2 with PKCE flow', {
      scope: 'team',
      projectDir: tmpDir,
    });

    assert(res.success);
    assert(res.resolvedConflicts.length >= 1, 'Expected resolved conflict in recordLesson result');

    const teamMemPath = path.join(tmpDir, '.openguild', 'team_memory.md');
    const diskContent = fs.readFileSync(teamMemPath, 'utf8');
    assert(diskContent.includes('[SUPERSEDED]'));
    assert(diskContent.includes('OAuth1'));
    assert(diskContent.includes('OAuth2 with PKCE'));

    console.log('  ✔ recordLesson autonomous conflict superseding verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('✨ All Memory Conflict & Evolution Tests Passed!\n');
