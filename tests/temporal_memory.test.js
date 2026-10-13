'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  calculateFreshness, freshnessTier, generateEntryId,
  parseMemoryEntries, runTemporalTimeline,
} = require('../lib/temporal_memory');

// ── Unit Tests ─────────────────────────────────────────────────────────
console.log('  ⏱ temporal_memory.test.js');

// Test 1: Freshness calculation — recent date should be fresh
const recentFreshness = calculateFreshness(new Date().toISOString());
assert.ok(recentFreshness > 0.9, `Recent freshness should be >0.9, got ${recentFreshness}`);

// Test 2: Freshness calculation — old date should decay
const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(); // 120 days ago
const oldFreshness = calculateFreshness(oldDate);
assert.ok(oldFreshness < 0.3, `120-day freshness should be <0.3, got ${oldFreshness}`);

// Test 3: Freshness tiers
assert.strictEqual(freshnessTier(0.9).label, '🟢 FRESH');
assert.strictEqual(freshnessTier(0.6).label, '🟡 AGING');
assert.strictEqual(freshnessTier(0.3).label, '🟠 STALE');
assert.strictEqual(freshnessTier(0.1).label, '🔴 ANCIENT');

// Test 4: Entry ID generation — deterministic
const id1 = generateEntryId('Always use async/await');
const id2 = generateEntryId('Always use async/await');
assert.strictEqual(id1, id2, 'Same text should generate same ID');

// Test 5: Entry ID — different text → different ID
const id3 = generateEntryId('Use TypeScript for new projects');
assert.notStrictEqual(id1, id3, 'Different text should generate different IDs');

// Test 6: runTemporalTimeline returns valid structure
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-timeline-'));
const ogDir = path.join(tmpDir, '.openguild');
fs.mkdirSync(ogDir, { recursive: true });
fs.writeFileSync(path.join(ogDir, 'team_memory.md'), `# Team Memory
- [2026-01-15] [SECURITY] Always validate JWT tokens
- [2026-09-01] [ARCHITECTURE] Use repository pattern for data access
`);

const result = runTemporalTimeline(tmpDir);
assert.ok(result.report.includes('Temporal Memory Timeline'), 'Report should have timeline header');
assert.ok(result.stats.totalMemories >= 0, 'Stats should include memory count');
assert.ok(typeof result.stats.avgFreshness === 'number', 'Stats should include avgFreshness');

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('  ✅ temporal_memory: All tests passed');
