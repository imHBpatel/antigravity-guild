/**
 * Superpower 30: Software Bill of Materials (SBOM) Generator
 * 
 * Inspired by Syft, CycloneDX, SPDX.
 * Generates machine-readable SBOMs in CycloneDX 1.5 JSON format
 * with zero external tooling — critical for enterprise compliance
 * and EU Cyber Resilience Act readiness.
 * 
 * Zero external dependencies — pure Node.js built-ins only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── SBOM Spec Constants ────────────────────────────────────────────────
const CYCLONEDX_SPEC_VERSION = '1.5';
const SBOM_VERSION = 1;

// ── Component Extraction ───────────────────────────────────────────────
/**
 * Extract components from npm package-lock.json for deep dependency tree.
 */
function extractNpmComponents(projectRoot) {
  const components = [];
  
  // Try package-lock.json first for exact versions
  const lockPath = path.join(projectRoot, 'package-lock.json');
  const pkgPath = path.join(projectRoot, 'package.json');

  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      
      // package-lock.json v3 format (npm 7+)
      if (lock.packages) {
        for (const [pkgKey, pkgInfo] of Object.entries(lock.packages)) {
          if (!pkgKey || pkgKey === '') continue; // Skip root
          const name = pkgKey.replace(/^node_modules\//, '');
          if (name.includes('node_modules/')) continue; // Skip nested for brevity

          components.push(createComponent(name, pkgInfo.version || 'unknown', {
            type: 'library',
            scope: pkgInfo.dev ? 'optional' : 'required',
            license: pkgInfo.license || undefined,
            integrity: pkgInfo.integrity || undefined,
          }));
        }
      }
      // package-lock.json v1/v2 format
      else if (lock.dependencies) {
        for (const [name, info] of Object.entries(lock.dependencies)) {
          components.push(createComponent(name, info.version || 'unknown', {
            type: 'library',
            scope: info.dev ? 'optional' : 'required',
            integrity: info.integrity || undefined,
          }));
        }
      }
    } catch (_) { /* fallback to package.json */ }
  }

  // Fallback: read from package.json
  if (components.length === 0 && fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      for (const [name, version] of Object.entries(pkg.dependencies || {})) {
        components.push(createComponent(name, cleanVersion(version), {
          type: 'library', scope: 'required',
        }));
      }
      for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
        components.push(createComponent(name, cleanVersion(version), {
          type: 'library', scope: 'optional',
        }));
      }
    } catch (_) { /* skip */ }
  }

  return components;
}

/**
 * Extract components from Python requirements/poetry lockfiles.
 */
function extractPythonComponents(projectRoot) {
  const components = [];
  
  // Try poetry.lock first
  const poetryLock = path.join(projectRoot, 'poetry.lock');
  if (fs.existsSync(poetryLock)) {
    try {
      const content = fs.readFileSync(poetryLock, 'utf8');
      const packages = content.split('[[package]]').slice(1);
      for (const pkg of packages) {
        const nameMatch = pkg.match(/name\s*=\s*"([^"]+)"/);
        const versionMatch = pkg.match(/version\s*=\s*"([^"]+)"/);
        if (nameMatch && versionMatch) {
          components.push(createComponent(nameMatch[1], versionMatch[1], {
            type: 'library', purl: `pkg:pypi/${nameMatch[1]}@${versionMatch[1]}`,
          }));
        }
      }
    } catch (_) { /* skip */ }
  }

  // Fallback: requirements.txt
  if (components.length === 0) {
    const reqPath = path.join(projectRoot, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      try {
        const content = fs.readFileSync(reqPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[.*?\])?\s*(?:[><=!~]+\s*)?(\d[\d.]*)?/);
          if (match) {
            components.push(createComponent(match[1], match[2] || 'unknown', {
              type: 'library', purl: `pkg:pypi/${match[1]}@${match[2] || 'unknown'}`,
            }));
          }
        }
      } catch (_) { /* skip */ }
    }
  }

  return components;
}

/**
 * Extract components from Go go.sum for exact versions + hashes.
 */
function extractGoComponents(projectRoot) {
  const components = [];
  const goSum = path.join(projectRoot, 'go.sum');
  const goMod = path.join(projectRoot, 'go.mod');

  const file = fs.existsSync(goSum) ? goSum : goMod;
  if (!fs.existsSync(file)) return components;

  try {
    const content = fs.readFileSync(file, 'utf8');
    const seen = new Set();

    for (const line of content.split('\n')) {
      const match = line.trim().match(/^(\S+)\s+v?(\S+?)(?:\/go\.mod)?\s/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        const version = match[2].replace(/\/go\.mod$/, '');
        components.push(createComponent(match[1], version, {
          type: 'library', purl: `pkg:golang/${match[1]}@${version}`,
        }));
      }
    }
  } catch (_) { /* skip */ }

  return components;
}

// ── Component Creation ─────────────────────────────────────────────────
/**
 * Create a CycloneDX component object.
 */
function createComponent(name, version, options = {}) {
  const component = {
    type: options.type || 'library',
    name,
    version,
    purl: options.purl || generatePurl('npm', name, version),
    'bom-ref': `${name}@${version}`,
  };

  if (options.scope) component.scope = options.scope;
  if (options.license) {
    component.licenses = [{ license: { id: options.license } }];
  }

  // Generate SHA-256 hash from integrity if available
  if (options.integrity) {
    const hashMatch = options.integrity.match(/sha512-(.+)/);
    if (hashMatch) {
      component.hashes = [{
        alg: 'SHA-512',
        content: Buffer.from(hashMatch[1], 'base64').toString('hex'),
      }];
    }
  }

  return component;
}

/**
 * Generate a Package URL (purl) identifier.
 */
function generatePurl(ecosystem, name, version) {
  const typeMap = { npm: 'npm', python: 'pypi', go: 'golang', rust: 'cargo' };
  const type = typeMap[ecosystem] || ecosystem;
  
  if (name.startsWith('@')) {
    // Scoped npm packages: @scope/name → pkg:npm/%40scope/name@version
    return `pkg:${type}/${encodeURIComponent(name)}@${version}`;
  }
  return `pkg:${type}/${name}@${version}`;
}

/**
 * Clean version range to extract base version.
 */
function cleanVersion(version) {
  if (!version) return 'unknown';
  return version.replace(/^[^0-9]*/, '') || version;
}

// ── SBOM Generation ────────────────────────────────────────────────────
/**
 * Generate a CycloneDX 1.5 SBOM in JSON format.
 */
function generateCycloneDxSbom(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  let projectMeta = { name: path.basename(projectRoot), version: '0.0.0' };
  
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      projectMeta = {
        name: pkg.name || projectMeta.name,
        version: pkg.version || projectMeta.version,
        description: pkg.description,
        license: pkg.license,
        author: typeof pkg.author === 'string' ? pkg.author : (pkg.author?.name || undefined),
      };
    } catch (_) { /* use defaults */ }
  }

  // Collect components from all ecosystems
  const components = [
    ...extractNpmComponents(projectRoot),
    ...extractPythonComponents(projectRoot),
    ...extractGoComponents(projectRoot),
  ];

  // Enrich with license info from node_modules if available
  const nodeModules = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    for (const comp of components) {
      if (comp.licenses) continue;
      const depPkg = path.join(nodeModules, comp.name, 'package.json');
      try {
        if (fs.existsSync(depPkg)) {
          const depInfo = JSON.parse(fs.readFileSync(depPkg, 'utf8'));
          if (depInfo.license) {
            comp.licenses = [{ license: { id: depInfo.license } }];
          }
        }
      } catch (_) { /* skip */ }
    }
  }

  // Generate serial number
  const serialNumber = `urn:uuid:${generateUuid()}`;

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: CYCLONEDX_SPEC_VERSION,
    serialNumber,
    version: SBOM_VERSION,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{
        vendor: 'OmniGuild',
        name: 'omniguild-sbom',
        version: '4.0.0',
      }],
      component: {
        type: 'application',
        name: projectMeta.name,
        version: projectMeta.version,
        description: projectMeta.description,
        ...(projectMeta.license ? { licenses: [{ license: { id: projectMeta.license } }] } : {}),
      },
    },
    components,
  };

  return sbom;
}

/**
 * Generate a UUID v4 using crypto.
 */
function generateUuid() {
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 1

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

// ── SBOM Diff ──────────────────────────────────────────────────────────
/**
 * Compare two SBOMs and show what changed.
 */
function diffSboms(sbomA, sbomB) {
  const mapA = new Map(sbomA.components.map(c => [`${c.name}@${c.version}`, c]));
  const mapB = new Map(sbomB.components.map(c => [`${c.name}@${c.version}`, c]));

  const added = [];
  const removed = [];
  const versionChanged = [];

  // Find additions and version changes
  const nameMapA = new Map();
  for (const c of sbomA.components) {
    nameMapA.set(c.name, c.version);
  }
  const nameMapB = new Map();
  for (const c of sbomB.components) {
    nameMapB.set(c.name, c.version);
  }

  for (const [name, version] of nameMapB) {
    if (!nameMapA.has(name)) {
      added.push({ name, version });
    } else if (nameMapA.get(name) !== version) {
      versionChanged.push({
        name,
        from: nameMapA.get(name),
        to: version,
      });
    }
  }

  for (const [name, version] of nameMapA) {
    if (!nameMapB.has(name)) {
      removed.push({ name, version });
    }
  }

  return { added, removed, versionChanged };
}

// ── Markdown Summary ───────────────────────────────────────────────────
/**
 * Format SBOM as a human-readable Markdown summary.
 */
function formatSbomSummary(sbom) {
  const lines = [];

  lines.push('# 📋 Software Bill of Materials (SBOM)');
  lines.push('');
  lines.push(`**Project:** ${sbom.metadata.component.name} v${sbom.metadata.component.version}`);
  lines.push(`**Generated:** ${sbom.metadata.timestamp}`);
  lines.push(`**Format:** CycloneDX ${sbom.specVersion}`);
  lines.push(`**Serial:** ${sbom.serialNumber}`);
  lines.push(`**Total Components:** ${sbom.components.length}`);
  lines.push('');

  // License distribution
  const licenseCount = {};
  for (const c of sbom.components) {
    const lic = c.licenses?.[0]?.license?.id || 'Unknown';
    licenseCount[lic] = (licenseCount[lic] || 0) + 1;
  }

  lines.push('## License Distribution');
  const sortedLicenses = Object.entries(licenseCount).sort((a, b) => b[1] - a[1]);
  for (const [license, count] of sortedLicenses) {
    const bar = '█'.repeat(Math.min(30, Math.round(count / sbom.components.length * 30)));
    lines.push(`- **${license}**: ${count} ${bar}`);
  }
  lines.push('');

  // Component table
  lines.push('## Components');
  lines.push('| Name | Version | Scope | License |');
  lines.push('|:---|:---|:---|:---|');
  
  const sorted = [...sbom.components].sort((a, b) => a.name.localeCompare(b.name));
  for (const c of sorted.slice(0, 100)) {
    const license = c.licenses?.[0]?.license?.id || '-';
    const scope = c.scope || '-';
    lines.push(`| \`${c.name}\` | ${c.version} | ${scope} | ${license} |`);
  }
  if (sorted.length > 100) {
    lines.push(`| _...and ${sorted.length - 100} more_ | | | |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Generate an SBOM for the project.
 * @param {string} projectRoot — project directory
 * @param {object} options — { format: 'json'|'markdown', output: string }
 * @returns {{ sbom: object, report: string, json: string }}
 */
function generateSbom(projectRoot, options = {}) {
  const sbom = generateCycloneDxSbom(projectRoot);
  const json = JSON.stringify(sbom, null, 2);
  const report = formatSbomSummary(sbom);

  // Save SBOM file if output path specified
  if (options.output) {
    fs.writeFileSync(options.output, json, 'utf8');
  }

  return { sbom, report, json };
}

module.exports = {
  generateSbom,
  generateCycloneDxSbom,
  extractNpmComponents,
  extractPythonComponents,
  extractGoComponents,
  createComponent,
  generatePurl,
  diffSboms,
  formatSbomSummary,
  generateUuid,
};
