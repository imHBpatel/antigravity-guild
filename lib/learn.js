'use strict';

const fs = require('fs');
const path = require('path');
const { c } = require('./constants');
const { getGlobalMemoryPath, initMemoryHub } = require('./memory');

/**
 * Common regex patterns to scrub sensitive credentials before writing to persistent memory.
 */
const SECRET_PATTERNS = [
  // AWS Access Key ID
  /\bAKIA[0-9A-Z]{16}\b/g,
  // GitHub Personal Access Tokens & fine-grained tokens
  /\bgh[pousr]_[A-Za-z0-9_]{20,255}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,255}\b/g,
  // Generic Private Keys
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  // Bearer tokens in headers or strings
  /\bBearer\s+[A-Za-z0-9_\-\.]{20,}\b/gi,
  // Generic API keys and secret assignments
  /(?:api[_-]?key|secret[_-]?token|auth[_-]?token|client[_-]?secret)\s*[:=]\s*["']?([A-Za-z0-9_\-]{16,})["']?/gi,
];

/**
 * Scrub sensitive credentials from text.
 *
 * @param {string} text
 * @returns {{ sanitized: string, scrubbed: boolean }}
 */
function scrubSecrets(text) {
  let sanitized = text;
  let scrubbed = false;

  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(sanitized)) {
      scrubbed = true;
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, (match, ...args) => {
        const captured = typeof args[0] === 'string' && args.length > 2 ? args[0] : null;
        if (captured) {
          return match.replace(captured, '[REDACTED_SECRET]');
        }
        return '[REDACTED_SECRET]';
      });
      pattern.lastIndex = 0;
    }
  }

  return { sanitized, scrubbed };
}

/**
 * Infer category from lesson text if not explicitly provided.
 *
 * @param {string} text
 * @returns {string}
 */
function inferCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes('security') || lower.includes('auth') || lower.includes('token') || lower.includes('cors') || lower.includes('xss')) {
    return 'SECURITY';
  }
  if (lower.includes('perf') || lower.includes('latency') || lower.includes('cache') || lower.includes('bottleneck') || lower.includes('query')) {
    return 'PERFORMANCE';
  }
  if (lower.includes('arch') || lower.includes('model') || lower.includes('schema') || lower.includes('boundary') || lower.includes('domain')) {
    return 'ARCHITECTURE';
  }
  if (lower.includes('bug') || lower.includes('fix') || lower.includes('null') || lower.includes('exception') || lower.includes('crash')) {
    return 'BUGFIX';
  }
  if (lower.includes('test') || lower.includes('qa') || lower.includes('invariant') || lower.includes('mock')) {
    return 'INVARIANTS';
  }
  if (lower.includes('ui') || lower.includes('ux') || lower.includes('css') || lower.includes('layout') || lower.includes('animation')) {
    return 'UI-UX';
  }
  return 'LESSON';
}

/**
 * Record a new insight/lesson into OpenGuild persistent memory.
 *
 * @param {string} insight - The raw lesson or architectural takeaway.
 * @param {object} options - Configuration options.
 * @param {'global'|'team'} [options.scope='global'] - Target memory vault.
 * @param {string} [options.category] - Explicit category (e.g. 'ARCHITECTURE', 'SECURITY').
 * @param {string[]} [options.tags] - Array of tags (e.g. ['postgres', 'indexing']).
 * @param {string} [options.projectDir=process.cwd()] - Current workspace root.
 * @param {string} [options.customFile] - Custom filename override.
 * @returns {object} { success: boolean, message: string, scrubbed: boolean, filePath: string, entry: string }
 */
function recordLesson(insight, options = {}) {
  if (!insight || !insight.trim()) {
    throw new Error('Lesson content cannot be empty.');
  }

  const { sanitized, scrubbed } = scrubSecrets(insight.trim());
  const category = (options.category || inferCategory(sanitized)).toUpperCase();
  const tagsStr = Array.isArray(options.tags) && options.tags.length > 0
    ? ` [${options.tags.map(t => `#${t.replace(/^#/, '')}`).join(' ')}]`
    : '';

  const dateStr = new Date().toISOString().substring(0, 10);
  const formattedEntry = `- [${dateStr}] **[${category}]**${tagsStr} ${sanitized}`;

  const scope = options.scope === 'team' ? 'team' : 'global';
  const projectDir = options.projectDir || process.cwd();

  let targetDir;
  let filename;

  if (scope === 'team') {
    targetDir = path.join(projectDir, '.openguild');
    filename = options.customFile || 'team_memory.md';
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } else {
    initMemoryHub(false);
    targetDir = getGlobalMemoryPath();
    filename = options.customFile || 'institutional_memory.md';
  }

  const filePath = path.join(targetDir, filename);

  // Read existing content to check for exact duplicate
  let existingContent = '';
  if (fs.existsSync(filePath)) {
    existingContent = fs.readFileSync(filePath, 'utf8');
    if (existingContent.includes(sanitized)) {
      return {
        success: true,
        isDuplicate: true,
        scrubbed,
        filePath,
        entry: formattedEntry,
        message: `Lesson already documented in ${filename}. Skipped duplicate.`,
      };
    }
  }

  const separator = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n' : '';
  const newContent = `${existingContent}${separator}${formattedEntry}\n`;
  fs.writeFileSync(filePath, newContent, 'utf8');

  return {
    success: true,
    isDuplicate: false,
    scrubbed,
    filePath,
    entry: formattedEntry,
    message: `Recorded lesson into ${scope === 'team' ? 'team' : 'global'} memory (${filename}).`,
  };
}

module.exports = {
  scrubSecrets,
  inferCategory,
  recordLesson,
};
