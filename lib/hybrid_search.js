'use strict';

const fs = require('fs');
const path = require('path');

// Common English stopwords to ignore in BM25 calculation
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor',
  'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
]);

/**
 * Tokenize text into lowercase alphanumeric words, filtering stopwords.
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  const words = text.toLowerCase().match(/[a-z0-9_'-]+/g) || [];
  return words.filter(w => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Perform BM25 Okapi ranking over a collection of documents/chunks.
 *
 * @param {Array<object>} documents - Array of { id, text, metadata }
 * @param {string} query - Raw search query string.
 * @param {object} options - { k1: 1.2, b: 0.75, minScore: 0.1, limit: 10 }
 * @returns {Array<object>} Sorted array of { document, score, relevancePercent }
 */
function bm25Search(documents, query, options = {}) {
  if (!documents || documents.length === 0 || !query || !query.trim()) {
    return [];
  }

  const k1 = options.k1 !== undefined ? options.k1 : 1.2;
  const b = options.b !== undefined ? options.b : 0.75;
  const minScore = options.minScore || 0.05;
  const limit = options.limit || 15;

  const rawQuery = query.toLowerCase().trim();
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    // If all tokens were stopwords, fallback to raw tokens
    const rawTokens = (rawQuery.match(/[a-z0-9_'-]+/g) || []).filter(w => w.length > 0);
    if (rawTokens.length > 0) {
      queryTokens.push(...rawTokens);
    } else {
      return [];
    }
  }

  // Pre-tokenize and calculate document lengths
  let totalLength = 0;
  const docTokensList = [];
  const docFreqs = new Map(); // term -> count of docs containing term

  for (let i = 0; i < documents.length; i++) {
    const tokens = tokenize(documents[i].text);
    docTokensList.push(tokens);
    totalLength += tokens.length;

    const uniqueDocTokens = new Set(tokens);
    for (const token of uniqueDocTokens) {
      docFreqs.set(token, (docFreqs.get(token) || 0) + 1);
    }
  }

  const N = documents.length;
  const avgdl = totalLength / (N || 1);

  // Calculate scores for each document
  const results = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const tokens = docTokensList[i];
    const docLen = tokens.length;

    // Count term frequencies in this document
    const termFreq = new Map();
    for (const t of tokens) {
      termFreq.set(t, (termFreq.get(t) || 0) + 1);
    }

    let score = 0;

    for (const q of queryTokens) {
      const tf = termFreq.get(q) || 0;
      if (tf === 0) continue;

      const df = docFreqs.get(q) || 0;
      // Probabilistic IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

      // BM25 Okapi term saturation
      const denom = tf + k1 * (1 - b + b * (docLen / (avgdl || 1)));
      const termScore = idf * ((tf * (k1 + 1)) / (denom || 1));

      score += termScore;
    }

    // Exact phrase bonus (Mem0 semantic precision boost)
    if (doc.text.toLowerCase().includes(rawQuery)) {
      score += 2.5;
    }

    // Header boost (Markdown # or ##)
    if (doc.text.startsWith('#')) {
      score *= 1.3;
    }

    if (score >= minScore) {
      results.push({
        document: doc,
        score,
      });
    }
  }

  if (results.length === 0) return [];

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  const maxScore = results[0].score || 1;

  // Format relevance percentages
  return results.slice(0, limit).map(res => ({
    ...res,
    relevancePercent: Math.min(100, Math.round((res.score / maxScore) * 100)),
  }));
}

/**
 * Chunk markdown files in memory vaults into atomic searchable entries.
 */
function extractVaultEntries(memoryDirs) {
  const documents = [];
  let docId = 0;

  for (const m of memoryDirs) {
    if (!fs.existsSync(m.dir)) continue;

    try {
      const files = fs.readdirSync(m.dir);
      for (const file of files) {
        const filePath = path.join(m.dir, file);
        if (!fs.statSync(filePath).isFile()) continue;

        const text = fs.readFileSync(filePath, 'utf8');
        const lines = text.split(/\r?\n/);

        let currentSection = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith('#')) {
            currentSection = line;
          }

          // Individual list entries, rules, or header lines
          if (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line) || line.startsWith('#')) {
            docId++;
            documents.push({
              id: docId,
              text: line,
              section: currentSection,
              file,
              vault: m.label,
              lineNum: i + 1,
            });
          }
        }
      }
    } catch {
      // Ignore unreadable dirs
    }
  }

  return documents;
}

/**
 * Execute BM25 search across all global and team memory vaults.
 *
 * @param {Array<object>} memoryDirs - [{ label, dir }]
 * @param {string} query - Search query.
 * @param {object} options - Options for BM25 search.
 * @returns {object} { query, totalEntries, matches, markdown }
 */
function searchMemoryVaults(memoryDirsOrQuery, maybeQuery, options = {}) {
  let memoryDirs;
  let query;
  let opts = options;

  if (typeof memoryDirsOrQuery === 'string') {
    query = memoryDirsOrQuery;
    opts = typeof maybeQuery === 'object' && maybeQuery !== null ? maybeQuery : options;
    const cwd = opts.cwd || process.cwd();
    const os = require('os');
    const { GLOBAL_DIR_NAME } = require('./constants');
    const globalPath = path.join(os.homedir(), GLOBAL_DIR_NAME, 'memory');
    memoryDirs = [
      { label: 'Global Memory Vault', dir: globalPath },
      { label: 'Workspace Team Memory', dir: path.join(cwd, '.openguild') },
    ];
  } else {
    memoryDirs = memoryDirsOrQuery;
    query = maybeQuery;
  }

  const documents = extractVaultEntries(memoryDirs);
  const matches = bm25Search(documents, query, opts);

  if (matches.length === 0) {
    return {
      query,
      totalEntries: documents.length,
      matches: [],
      markdown: `No relevant memory entries found for query "${query}" (searched ${documents.length} entries across vaults).`,
    };
  }

  let markdown = `# 🔍 BM25 Hybrid Memory Search: "${query}"\n\n`;
  markdown += `> Found **${matches.length}** high-relevance entries across ${documents.length} vault rules.\n\n`;

  for (const m of matches) {
    const doc = m.document;
    const badge = m.relevancePercent >= 90 ? '🟢' : m.relevancePercent >= 70 ? '🟡' : '⚪';
    markdown += `- ${badge} **[${m.relevancePercent}% Match] [${doc.vault}] \`${doc.file}:${doc.lineNum}\`**\n`;
    markdown += `  ${doc.text}\n\n`;
  }

  return {
    query,
    totalEntries: documents.length,
    matches,
    markdown: markdown.trim(),
  };
}

module.exports = {
  STOPWORDS,
  tokenize,
  bm25Search,
  extractVaultEntries,
  searchMemoryVaults,
};
