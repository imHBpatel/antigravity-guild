/**
 * Superpower 26: Temporal Memory Engine
 * 
 * Inspired by Zep/Graphiti temporal knowledge graphs.
 * Tracks WHEN each memory/lesson was learned, detects stale/outdated lessons,
 * shows time-travel views of project knowledge evolution, and assigns
 * freshness scores with confidence decay.
 * 
 * Zero external dependencies — pure Node.js built-ins only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Constants ──────────────────────────────────────────────────────────
const STALE_THRESHOLD_DAYS = 90;
const FRESHNESS_HALF_LIFE_DAYS = 60; // Confidence halves every 60 days
const GLOBAL_MEMORY_DIR = path.join(os.homedir(), '.openguild', 'memory');
const TEMPORAL_INDEX_FILE = 'temporal_index.json';

// ── Temporal Index Management ──────────────────────────────────────────
/**
 * Load or initialize the temporal index that tracks when each memory entry
 * was created, last reinforced, and access frequency.
 */
function loadTemporalIndex(projectRoot) {
  const locations = [
    path.join(projectRoot, '.openguild', TEMPORAL_INDEX_FILE),
    path.join(GLOBAL_MEMORY_DIR, TEMPORAL_INDEX_FILE),
  ];
  
  const merged = {};
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const data = JSON.parse(fs.readFileSync(loc, 'utf8'));
        // Merge entries, preferring the most recently updated
        for (const [key, val] of Object.entries(data)) {
          if (!merged[key] || new Date(val.lastReinforced) > new Date(merged[key].lastReinforced)) {
            merged[key] = val;
          }
        }
      } catch (_) { /* corrupt index — rebuild */ }
    }
  }
  return merged;
}

/**
 * Save the temporal index to the project's .openguild directory.
 */
function saveTemporalIndex(projectRoot, index) {
  const dir = path.join(projectRoot, '.openguild');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, TEMPORAL_INDEX_FILE),
    JSON.stringify(index, null, 2),
    'utf8'
  );
}

// ── Memory Parsing ─────────────────────────────────────────────────────
/**
 * Parse memory files (institutional_memory.md, team_memory.md, etc.)
 * and extract individual entries with their embedded timestamps.
 */
function parseMemoryEntries(projectRoot) {
  const entries = [];
  const memoryFiles = [];

  // Collect memory files from global + workspace
  const globalMem = path.join(GLOBAL_MEMORY_DIR, 'institutional_memory.md');
  const workspaceMem = path.join(projectRoot, '.openguild', 'team_memory.md');
  
  if (fs.existsSync(globalMem)) memoryFiles.push({ path: globalMem, source: 'global' });
  if (fs.existsSync(workspaceMem)) memoryFiles.push({ path: workspaceMem, source: 'workspace' });

  for (const mf of memoryFiles) {
    try {
      const content = fs.readFileSync(mf.path, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        // Extract date patterns: [2026-09-04], [YYYY-MM-DD]
        const dateMatch = line.match(/\[(\d{4}-\d{2}-\d{2})\]/);
        // Extract category: [SECURITY], [ARCHITECTURE], etc.
        const catMatch = line.match(/\[([A-Z_]+)\]/g);
        
        const cleanText = line
          .replace(/^[-*•]\s*/, '')
          .replace(/\[(\d{4}-\d{2}-\d{2})\]\s*/, '')
          .replace(/\[[A-Z_]+\]\s*/g, '')
          .trim();

        if (cleanText.length > 5) {
          const categories = catMatch
            ? catMatch.map(c => c.replace(/[\[\]]/g, '')).filter(c => !/^\d{4}/.test(c))
            : ['GENERAL'];

          entries.push({
            id: generateEntryId(cleanText),
            text: cleanText,
            source: mf.source,
            sourceFile: mf.path,
            line: i + 1,
            dateRecorded: dateMatch ? dateMatch[1] : null,
            categories,
          });
        }
      }
    } catch (_) { /* skip unreadable files */ }
  }

  return entries;
}

/**
 * Generate a deterministic ID from entry text for deduplication.
 */
function generateEntryId(text) {
  // Simple hash using string char codes — no crypto needed for IDs
  let hash = 0;
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32-bit integer
  }
  return 'mem_' + Math.abs(hash).toString(36);
}

// ── Freshness Scoring ──────────────────────────────────────────────────
/**
 * Calculate memory freshness score (0.0 to 1.0) using exponential decay.
 * Freshness = exp(-λ * days_since_last_reinforcement)
 * where λ = ln(2) / half_life_days
 */
function calculateFreshness(lastReinforcedDate, now = new Date()) {
  if (!lastReinforcedDate) return 0.1; // Unknown date → very low confidence
  
  const lastDate = new Date(lastReinforcedDate);
  const daysSince = (now - lastDate) / (1000 * 60 * 60 * 24);
  
  if (daysSince < 0) return 1.0; // Future date — treat as fresh
  
  const lambda = Math.LN2 / FRESHNESS_HALF_LIFE_DAYS;
  return Math.max(0.01, Math.exp(-lambda * daysSince));
}

/**
 * Classify freshness into human-readable tiers.
 */
function freshnessTier(score) {
  if (score >= 0.8) return { label: '🟢 FRESH', color: 'green' };
  if (score >= 0.5) return { label: '🟡 AGING', color: 'yellow' };
  if (score >= 0.2) return { label: '🟠 STALE', color: 'orange' };
  return { label: '🔴 ANCIENT', color: 'red' };
}

// ── Temporal Conflict Detection ────────────────────────────────────────
/**
 * Detect potential temporal conflicts — entries that may contradict
 * each other based on overlapping keywords with different dates.
 */
function detectTemporalConflicts(entries, temporalIndex) {
  const conflicts = [];
  const keywordMap = {};

  for (const entry of entries) {
    // Extract significant keywords (>4 chars, not common words)
    const keywords = extractKeywords(entry.text);
    for (const kw of keywords) {
      if (!keywordMap[kw]) keywordMap[kw] = [];
      keywordMap[kw].push(entry);
    }
  }

  // Find entries that share keywords but have different dates
  for (const [keyword, relatedEntries] of Object.entries(keywordMap)) {
    if (relatedEntries.length < 2) continue;

    for (let i = 0; i < relatedEntries.length; i++) {
      for (let j = i + 1; j < relatedEntries.length; j++) {
        const a = relatedEntries[i];
        const b = relatedEntries[j];

        // Only flag if dates differ and texts are similar enough
        if (a.dateRecorded && b.dateRecorded && a.dateRecorded !== b.dateRecorded) {
          const similarity = calculateSimilarity(a.text, b.text);
          if (similarity > 0.4) {
            conflicts.push({
              keyword,
              entryA: { text: a.text, date: a.dateRecorded, source: a.source },
              entryB: { text: b.text, date: b.dateRecorded, source: b.source },
              similarity: Math.round(similarity * 100),
            });
          }
        }
      }
    }
  }

  // Deduplicate conflicts
  const seen = new Set();
  return conflicts.filter(c => {
    const key = [c.entryA.text, c.entryB.text].sort().join('|||');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract significant keywords from text.
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'always', 'never', 'should', 'would', 'could', 'using', 'every',
    'about', 'after', 'before', 'between', 'through', 'during', 'these',
    'those', 'their', 'there', 'where', 'which', 'while', 'other',
    'first', 'second', 'third', 'because', 'since', 'until', 'with',
    'from', 'into', 'that', 'this', 'then', 'than', 'when', 'what',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4 && !stopWords.has(w));
}

/**
 * Calculate Jaccard similarity between two texts.
 */
function calculateSimilarity(textA, textB) {
  const setA = new Set(extractKeywords(textA));
  const setB = new Set(extractKeywords(textB));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ── Timeline Generation ────────────────────────────────────────────────
/**
 * Generate a chronological timeline of all memory entries.
 */
function generateTimeline(entries, temporalIndex) {
  const now = new Date();
  
  // Enrich entries with temporal data
  const enriched = entries.map(entry => {
    const temporal = temporalIndex[entry.id] || {};
    const dateStr = temporal.lastReinforced || entry.dateRecorded || null;
    const freshness = calculateFreshness(dateStr, now);
    const tier = freshnessTier(freshness);

    return {
      ...entry,
      dateRecorded: entry.dateRecorded || temporal.created || 'Unknown',
      lastReinforced: temporal.lastReinforced || entry.dateRecorded || 'Never',
      accessCount: temporal.accessCount || 0,
      freshness: Math.round(freshness * 100),
      tier,
    };
  });

  // Sort by date (newest first), unknowns at the end
  enriched.sort((a, b) => {
    if (a.dateRecorded === 'Unknown') return 1;
    if (b.dateRecorded === 'Unknown') return -1;
    return new Date(b.dateRecorded) - new Date(a.dateRecorded);
  });

  return enriched;
}

// ── Report Formatting ──────────────────────────────────────────────────
/**
 * Format the temporal memory timeline as a Markdown report.
 */
function formatTimelineReport(timeline, conflicts) {
  const lines = [];
  const now = new Date();
  
  lines.push('# 🕰️ OmniGuild Temporal Memory Timeline');
  lines.push('');
  lines.push(`> Generated: ${now.toISOString().split('T')[0]}`);
  lines.push(`> Total Memories: ${timeline.length}`);
  
  // Summary stats
  const fresh = timeline.filter(e => e.freshness >= 80).length;
  const aging = timeline.filter(e => e.freshness >= 50 && e.freshness < 80).length;
  const stale = timeline.filter(e => e.freshness >= 20 && e.freshness < 50).length;
  const ancient = timeline.filter(e => e.freshness < 20).length;
  
  lines.push('');
  lines.push('## Memory Freshness Distribution');
  lines.push(`- 🟢 Fresh (>80%): **${fresh}** entries`);
  lines.push(`- 🟡 Aging (50-80%): **${aging}** entries`);
  lines.push(`- 🟠 Stale (20-50%): **${stale}** entries`);
  lines.push(`- 🔴 Ancient (<20%): **${ancient}** entries`);
  
  // Overall freshness grade
  const avgFreshness = timeline.length > 0
    ? Math.round(timeline.reduce((s, e) => s + e.freshness, 0) / timeline.length)
    : 0;
  const grade = avgFreshness >= 80 ? 'A+' : avgFreshness >= 65 ? 'A' :
    avgFreshness >= 50 ? 'B' : avgFreshness >= 35 ? 'C' : avgFreshness >= 20 ? 'D' : 'F';
  
  lines.push('');
  lines.push(`## Overall Memory Freshness Grade: **${grade}** (${avgFreshness}%)`);
  
  // Timeline entries
  lines.push('');
  lines.push('## Chronological Timeline');
  lines.push('');
  
  // Group by month
  const byMonth = {};
  for (const entry of timeline) {
    const month = entry.dateRecorded !== 'Unknown'
      ? entry.dateRecorded.substring(0, 7)
      : 'Unknown Date';
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(entry);
  }

  for (const [month, entries] of Object.entries(byMonth)) {
    lines.push(`### 📅 ${month}`);
    for (const entry of entries) {
      const src = entry.source === 'global' ? '🌐' : '📁';
      lines.push(`- ${entry.tier.label} [${entry.freshness}%] ${src} ${entry.text}`);
      if (entry.categories.length > 0 && entry.categories[0] !== 'GENERAL') {
        lines.push(`  _Categories: ${entry.categories.join(', ')}_`);
      }
    }
    lines.push('');
  }

  // Temporal conflicts
  if (conflicts.length > 0) {
    lines.push('## ⚠️ Temporal Conflicts Detected');
    lines.push('');
    lines.push('> These entries share keywords but were recorded at different times,');
    lines.push('> suggesting the older one may be superseded.');
    lines.push('');
    for (const conflict of conflicts) {
      lines.push(`### Conflict on keyword: \`${conflict.keyword}\` (${conflict.similarity}% similar)`);
      lines.push(`- **Earlier (${conflict.entryA.date}):** ${conflict.entryA.text}`);
      lines.push(`- **Later (${conflict.entryB.date}):** ${conflict.entryB.text}`);
      lines.push('');
    }
  }

  // Stale memory recommendations
  const staleEntries = timeline.filter(e => e.freshness < 20);
  if (staleEntries.length > 0) {
    lines.push('## 🧹 Stale Memory Recommendations');
    lines.push('');
    lines.push('> These memories have not been reinforced in over 90 days.');
    lines.push('> Consider reviewing and either reinforcing or archiving them.');
    lines.push('');
    for (const entry of staleEntries.slice(0, 10)) {
      lines.push(`- \`${entry.dateRecorded}\` — ${entry.text}`);
    }
    if (staleEntries.length > 10) {
      lines.push(`- _...and ${staleEntries.length - 10} more_`);
    }
  }

  return lines.join('\n');
}

// ── Reinforce Memory ───────────────────────────────────────────────────
/**
 * Reinforce a memory entry — update its lastReinforced timestamp
 * and increment access count. This refreshes the freshness score.
 */
function reinforceMemory(projectRoot, entryId) {
  const index = loadTemporalIndex(projectRoot);
  const now = new Date().toISOString();

  if (!index[entryId]) {
    index[entryId] = { created: now, lastReinforced: now, accessCount: 1 };
  } else {
    index[entryId].lastReinforced = now;
    index[entryId].accessCount = (index[entryId].accessCount || 0) + 1;
  }

  saveTemporalIndex(projectRoot, index);
  return index[entryId];
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Run the temporal memory timeline analysis.
 * @param {string} projectRoot — project directory path
 * @returns {{ report: string, timeline: Array, conflicts: Array, stats: Object }}
 */
function runTemporalTimeline(projectRoot) {
  const temporalIndex = loadTemporalIndex(projectRoot);
  const entries = parseMemoryEntries(projectRoot);
  
  // Auto-index any entries that don't have temporal data
  const now = new Date().toISOString();
  let indexUpdated = false;
  for (const entry of entries) {
    if (!temporalIndex[entry.id]) {
      temporalIndex[entry.id] = {
        created: entry.dateRecorded || now,
        lastReinforced: entry.dateRecorded || now,
        accessCount: 0,
      };
      indexUpdated = true;
    }
  }
  if (indexUpdated) {
    saveTemporalIndex(projectRoot, temporalIndex);
  }

  const timeline = generateTimeline(entries, temporalIndex);
  const conflicts = detectTemporalConflicts(entries, temporalIndex);
  const report = formatTimelineReport(timeline, conflicts);

  const avgFreshness = timeline.length > 0
    ? Math.round(timeline.reduce((s, e) => s + e.freshness, 0) / timeline.length)
    : 0;

  return {
    report,
    timeline,
    conflicts,
    stats: {
      totalMemories: timeline.length,
      freshCount: timeline.filter(e => e.freshness >= 80).length,
      staleCount: timeline.filter(e => e.freshness < 20).length,
      conflictCount: conflicts.length,
      avgFreshness,
    },
  };
}

module.exports = {
  runTemporalTimeline,
  reinforceMemory,
  calculateFreshness,
  freshnessTier,
  parseMemoryEntries,
  detectTemporalConflicts,
  generateEntryId,
  loadTemporalIndex,
  saveTemporalIndex,
  STALE_THRESHOLD_DAYS,
};
