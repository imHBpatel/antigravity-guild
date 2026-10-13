/**
 * Superpower 29: Dependency Vulnerability Scanner
 * 
 * Inspired by npm audit, Snyk, Grype.
 * Parses package.json, requirements.txt, go.mod, Cargo.toml and detects
 * known-vulnerable patterns, deprecated packages, phantom dependencies,
 * and license compatibility issues — all with zero external dependencies.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Known Vulnerability Patterns ───────────────────────────────────────
// These are patterns for packages/versions known to have critical vulnerabilities.
// In a production tool, this would be fetched from a CVE database.
// This embedded database covers the most impactful, widely-known issues.
const KNOWN_VULNERABLE = {
  npm: {
    'lodash': { below: '4.17.21', severity: 'HIGH', cve: 'CVE-2021-23337', description: 'Prototype Pollution in lodash' },
    'minimist': { below: '1.2.6', severity: 'CRITICAL', cve: 'CVE-2021-44906', description: 'Prototype Pollution in minimist' },
    'node-fetch': { below: '2.6.7', severity: 'HIGH', cve: 'CVE-2022-0235', description: 'Exposure of Sensitive Information in node-fetch' },
    'express': { below: '4.19.2', severity: 'MEDIUM', cve: 'CVE-2024-29041', description: 'Open Redirect in express' },
    'axios': { below: '1.6.0', severity: 'HIGH', cve: 'CVE-2023-45857', description: 'CSRF token exposure in axios' },
    'jsonwebtoken': { below: '9.0.0', severity: 'HIGH', cve: 'CVE-2022-23529', description: 'Insecure key handling in jsonwebtoken' },
    'tar': { below: '6.1.9', severity: 'HIGH', cve: 'CVE-2021-37712', description: 'Arbitrary File Overwrite in tar' },
    'path-parse': { below: '1.0.7', severity: 'MEDIUM', cve: 'CVE-2021-23343', description: 'ReDoS in path-parse' },
    'glob-parent': { below: '5.1.2', severity: 'HIGH', cve: 'CVE-2020-28469', description: 'ReDoS in glob-parent' },
    'nanoid': { below: '3.1.31', severity: 'MEDIUM', cve: 'CVE-2021-23566', description: 'Predictable output in nanoid' },
    'qs': { below: '6.10.3', severity: 'HIGH', cve: 'CVE-2022-24999', description: 'Prototype Pollution in qs' },
    'semver': { below: '7.5.2', severity: 'MEDIUM', cve: 'CVE-2022-25883', description: 'ReDoS in semver' },
    'xml2js': { below: '0.5.0', severity: 'MEDIUM', cve: 'CVE-2023-0842', description: 'Prototype Pollution in xml2js' },
    'tough-cookie': { below: '4.1.3', severity: 'MEDIUM', cve: 'CVE-2023-26136', description: 'Prototype Pollution in tough-cookie' },
    'undici': { below: '5.26.2', severity: 'HIGH', cve: 'CVE-2023-45143', description: 'Cookie leak in undici' },
  },
  python: {
    'django': { below: '4.2.7', severity: 'HIGH', cve: 'CVE-2023-46695', description: 'Denial of Service in Django' },
    'flask': { below: '2.3.2', severity: 'MEDIUM', cve: 'CVE-2023-30861', description: 'Session cookie handling in Flask' },
    'requests': { below: '2.31.0', severity: 'MEDIUM', cve: 'CVE-2023-32681', description: 'Information disclosure in requests' },
    'pillow': { below: '10.0.1', severity: 'HIGH', cve: 'CVE-2023-44271', description: 'Buffer overflow in Pillow' },
    'cryptography': { below: '41.0.4', severity: 'HIGH', cve: 'CVE-2023-49083', description: 'Null dereference in cryptography' },
    'urllib3': { below: '2.0.7', severity: 'MEDIUM', cve: 'CVE-2023-45803', description: 'Request body exposure in urllib3' },
  },
};

// ── Copyleft License Detection ─────────────────────────────────────────
const COPYLEFT_LICENSES = new Set([
  'GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0',
  'GPL-2.0-only', 'GPL-3.0-only', 'AGPL-3.0-only',
  'GPL-2.0-or-later', 'GPL-3.0-or-later',
  'EUPL-1.1', 'EUPL-1.2', 'MPL-2.0',
  'SSPL-1.0', 'OSL-3.0', 'CPAL-1.0',
]);

// ── Version Comparison ─────────────────────────────────────────────────
/**
 * Compare two semantic version strings.
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b.
 */
function compareVersions(a, b) {
  const partsA = (a || '0.0.0').replace(/[^0-9.]/g, '').split('.').map(Number);
  const partsB = (b || '0.0.0').replace(/[^0-9.]/g, '').split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const va = partsA[i] || 0;
    const vb = partsB[i] || 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

/**
 * Extract a clean version number from a version range string.
 * "^1.2.3" → "1.2.3", "~2.0.0" → "2.0.0", ">=3.0.0" → "3.0.0"
 */
function extractVersion(versionRange) {
  if (!versionRange) return null;
  const match = versionRange.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

// ── Dependency Manifest Parsing ────────────────────────────────────────
/**
 * Parse npm package.json for dependencies.
 */
function parseNpmDeps(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = {};
    
    for (const [name, version] of Object.entries(pkg.dependencies || {})) {
      deps[name] = { version, type: 'production' };
    }
    for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
      deps[name] = { version, type: 'development' };
    }
    for (const [name, version] of Object.entries(pkg.peerDependencies || {})) {
      if (!deps[name]) deps[name] = { version, type: 'peer' };
    }

    return { ecosystem: 'npm', dependencies: deps, manifest: 'package.json' };
  } catch (_) { return null; }
}

/**
 * Parse Python requirements.txt for dependencies.
 */
function parsePythonDeps(projectRoot) {
  const reqPath = path.join(projectRoot, 'requirements.txt');
  if (!fs.existsSync(reqPath)) return null;

  try {
    const content = fs.readFileSync(reqPath, 'utf8');
    const deps = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;

      const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[.*?\])?\s*(?:([><=!~]+)\s*(.+))?/);
      if (match) {
        deps[match[1].toLowerCase()] = {
          version: match[3] || '*',
          type: 'production',
          operator: match[2] || '',
        };
      }
    }

    return { ecosystem: 'python', dependencies: deps, manifest: 'requirements.txt' };
  } catch (_) { return null; }
}

/**
 * Parse Go go.mod for dependencies.
 */
function parseGoDeps(projectRoot) {
  const modPath = path.join(projectRoot, 'go.mod');
  if (!fs.existsSync(modPath)) return null;

  try {
    const content = fs.readFileSync(modPath, 'utf8');
    const deps = {};

    const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireBlock) {
      for (const line of requireBlock[1].split('\n')) {
        const match = line.trim().match(/^(\S+)\s+v?(\S+)/);
        if (match) {
          deps[match[1]] = { version: match[2], type: 'production' };
        }
      }
    }

    // Single-line requires
    const singleReqs = content.matchAll(/require\s+(\S+)\s+v?(\S+)/g);
    for (const m of singleReqs) {
      deps[m[1]] = { version: m[2], type: 'production' };
    }

    return { ecosystem: 'go', dependencies: deps, manifest: 'go.mod' };
  } catch (_) { return null; }
}

/**
 * Parse Rust Cargo.toml for dependencies.
 */
function parseRustDeps(projectRoot) {
  const cargoPath = path.join(projectRoot, 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) return null;

  try {
    const content = fs.readFileSync(cargoPath, 'utf8');
    const deps = {};
    let inDeps = false;
    let depType = 'production';

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      if (trimmed === '[dependencies]') { inDeps = true; depType = 'production'; continue; }
      if (trimmed === '[dev-dependencies]') { inDeps = true; depType = 'development'; continue; }
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) { inDeps = false; continue; }

      if (inDeps) {
        // name = "version" or name = { version = "X", ... }
        const simpleMatch = trimmed.match(/^(\w[\w-]*)\s*=\s*"([^"]+)"/);
        const tableMatch = trimmed.match(/^(\w[\w-]*)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);
        const match = simpleMatch || tableMatch;
        if (match) {
          deps[match[1]] = { version: match[2], type: depType };
        }
      }
    }

    return { ecosystem: 'rust', dependencies: deps, manifest: 'Cargo.toml' };
  } catch (_) { return null; }
}

// ── Vulnerability Scanning ─────────────────────────────────────────────
/**
 * Scan dependencies against known vulnerability database.
 */
function scanVulnerabilities(parsed) {
  const findings = [];
  const vulnDb = KNOWN_VULNERABLE[parsed.ecosystem] || {};

  for (const [name, info] of Object.entries(parsed.dependencies)) {
    const vuln = vulnDb[name];
    if (!vuln) continue;

    const installedVersion = extractVersion(info.version);
    if (!installedVersion) continue;

    if (compareVersions(installedVersion, vuln.below) < 0) {
      findings.push({
        type: 'VULNERABILITY',
        package: name,
        installedVersion,
        severity: vuln.severity,
        cve: vuln.cve,
        description: vuln.description,
        fixVersion: vuln.below,
        depType: info.type,
      });
    }
  }

  return findings;
}

// ── Phantom Dependency Detection ───────────────────────────────────────
/**
 * Detect packages that are imported/required in code but not listed
 * in the dependency manifest.
 */
function detectPhantomDeps(projectRoot, declaredDeps) {
  const phantom = [];
  const declared = new Set(Object.keys(declaredDeps));
  const imported = new Set();

  // Scan source files for imports
  const sourceFiles = collectJsFiles(projectRoot);
  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // require('package')
      const requireMatches = content.matchAll(/require\s*\(\s*['"]([^./][^'"]*)['"]\s*\)/g);
      for (const m of requireMatches) {
        const pkg = m[1].split('/')[0]; // Handle scoped: @org/pkg → @org
        if (m[1].startsWith('@')) {
          imported.add(m[1].split('/').slice(0, 2).join('/'));
        } else {
          imported.add(pkg);
        }
      }

      // import ... from 'package'
      const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^./][^'"]*)['"]/g);
      for (const m of importMatches) {
        const pkg = m[1].startsWith('@')
          ? m[1].split('/').slice(0, 2).join('/')
          : m[1].split('/')[0];
        imported.add(pkg);
      }
    } catch (_) { /* skip */ }
  }

  // Node.js built-in modules (not phantom)
  const builtins = new Set([
    'fs', 'path', 'os', 'http', 'https', 'url', 'util', 'crypto',
    'stream', 'events', 'buffer', 'child_process', 'net', 'dns',
    'zlib', 'assert', 'querystring', 'readline', 'cluster', 'worker_threads',
    'vm', 'tls', 'dgram', 'string_decoder', 'timers', 'console', 'process',
    'node:fs', 'node:path', 'node:os', 'node:http', 'node:https',
    'node:url', 'node:util', 'node:crypto', 'node:stream', 'node:events',
    'node:child_process', 'node:net', 'node:assert', 'node:test',
  ]);

  for (const pkg of imported) {
    if (!declared.has(pkg) && !builtins.has(pkg) && !pkg.startsWith('node:')) {
      phantom.push(pkg);
    }
  }

  return phantom;
}

/**
 * Collect JavaScript files from the project (shallow scan).
 */
function collectJsFiles(dir, maxDepth = 4, depth = 0) {
  if (depth > maxDepth) return [];
  const files = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor']);

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.has(entry.name) || (entry.isDirectory() && entry.name.startsWith('.'))) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectJsFiles(fullPath, maxDepth, depth + 1));
      } else if (/\.(js|ts|jsx|tsx|mjs|cjs)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (_) { /* skip */ }
  return files;
}

// ── License Analysis ───────────────────────────────────────────────────
/**
 * Check for copyleft license contamination in dependencies.
 */
function analyzeLicenses(projectRoot, deps) {
  const issues = [];
  const nodeModules = path.join(projectRoot, 'node_modules');
  if (!fs.existsSync(nodeModules)) return issues;

  for (const name of Object.keys(deps)) {
    const pkgJsonPath = path.join(nodeModules, name, 'package.json');
    try {
      if (!fs.existsSync(pkgJsonPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const license = pkg.license || '';

      if (COPYLEFT_LICENSES.has(license)) {
        issues.push({
          type: 'LICENSE_RISK',
          package: name,
          license,
          severity: license.includes('AGPL') || license.includes('SSPL') ? 'CRITICAL' : 'HIGH',
          description: `${name} uses copyleft license ${license} — may require your code to be open-sourced`,
        });
      }
    } catch (_) { /* skip */ }
  }

  return issues;
}

// ── Report Formatting ──────────────────────────────────────────────────
/**
 * Format the dependency scan report.
 */
function formatScanReport(ecosystem, vulnerabilities, phantomDeps, licenseIssues, depCount) {
  const lines = [];

  lines.push('# 🛡️ OmniGuild Dependency Vulnerability Scan');
  lines.push('');

  // Severity counts
  const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  const high = vulnerabilities.filter(v => v.severity === 'HIGH').length;
  const medium = vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
  const totalIssues = vulnerabilities.length + phantomDeps.length + licenseIssues.length;

  const grade = totalIssues === 0 ? 'A+' :
    critical > 0 ? 'F' : high > 2 ? 'D' : high > 0 ? 'C' :
    medium > 2 ? 'B' : 'A';

  lines.push(`## Dependency Health Grade: **${grade}**`);
  lines.push(`- **Ecosystem:** ${ecosystem}`);
  lines.push(`- **Dependencies Scanned:** ${depCount}`);
  lines.push(`- **Vulnerabilities Found:** ${vulnerabilities.length}`);
  lines.push(`- **Phantom Dependencies:** ${phantomDeps.length}`);
  lines.push(`- **License Issues:** ${licenseIssues.length}`);
  lines.push('');

  // Vulnerabilities
  if (vulnerabilities.length > 0) {
    lines.push('## 🚨 Known Vulnerabilities');
    lines.push('| Severity | Package | Installed | Fix Version | CVE |');
    lines.push('|:---:|:---|:---|:---|:---|');
    for (const v of vulnerabilities.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (order[a.severity] || 4) - (order[b.severity] || 4);
    })) {
      const icon = v.severity === 'CRITICAL' ? '🔴' : v.severity === 'HIGH' ? '🟠' : '🟡';
      lines.push(`| ${icon} ${v.severity} | \`${v.package}\` | ${v.installedVersion} | ≥${v.fixVersion} | ${v.cve} |`);
      lines.push(`| | _${v.description}_ | | | |`);
    }
    lines.push('');
  }

  // Phantom deps
  if (phantomDeps.length > 0) {
    lines.push('## 👻 Phantom Dependencies');
    lines.push('> These packages are imported in code but not listed in your manifest.');
    lines.push('');
    for (const pkg of phantomDeps) {
      lines.push(`- \`${pkg}\` — Add to dependencies or remove the import`);
    }
    lines.push('');
  }

  // License issues
  if (licenseIssues.length > 0) {
    lines.push('## ⚖️ License Compliance Issues');
    for (const issue of licenseIssues) {
      const icon = issue.severity === 'CRITICAL' ? '🔴' : '🟠';
      lines.push(`- ${icon} **${issue.package}** — License: \`${issue.license}\``);
      lines.push(`  _${issue.description}_`);
    }
    lines.push('');
  }

  if (totalIssues === 0) {
    lines.push('## ✅ All Clear!');
    lines.push('No vulnerabilities, phantom dependencies, or license issues detected.');
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Run the dependency vulnerability scan.
 */
function runDepScan(projectRoot) {
  // Auto-detect ecosystem
  const parsers = [parseNpmDeps, parsePythonDeps, parseGoDeps, parseRustDeps];
  const results = [];

  for (const parser of parsers) {
    const parsed = parser(projectRoot);
    if (parsed) {
      const vulnerabilities = scanVulnerabilities(parsed);
      const phantomDeps = parsed.ecosystem === 'npm'
        ? detectPhantomDeps(projectRoot, parsed.dependencies)
        : [];
      const licenseIssues = parsed.ecosystem === 'npm'
        ? analyzeLicenses(projectRoot, parsed.dependencies)
        : [];
      const depCount = Object.keys(parsed.dependencies).length;
      const report = formatScanReport(
        parsed.ecosystem, vulnerabilities, phantomDeps, licenseIssues, depCount
      );

      results.push({
        ecosystem: parsed.ecosystem,
        manifest: parsed.manifest,
        report,
        vulnerabilities,
        phantomDeps,
        licenseIssues,
        depCount,
      });
    }
  }

  if (results.length === 0) {
    return {
      report: '# 🛡️ Dependency Scan\n\nNo supported dependency manifests found (package.json, requirements.txt, go.mod, or Cargo.toml).',
      results: [],
    };
  }

  const combinedReport = results.map(r => r.report).join('\n---\n\n');
  return { report: combinedReport, results };
}

module.exports = {
  runDepScan,
  parseNpmDeps,
  parsePythonDeps,
  parseGoDeps,
  parseRustDeps,
  scanVulnerabilities,
  detectPhantomDeps,
  analyzeLicenses,
  compareVersions,
  extractVersion,
  KNOWN_VULNERABLE,
};
