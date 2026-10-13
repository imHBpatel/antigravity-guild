/**
 * Superpower 32: Secrets Vault & .env Encryption
 * 
 * Inspired by dotenvx, Infisical, SOPS.
 * Encrypts .env files using Node.js native crypto (AES-256-GCM),
 * enabling safe git-committed secrets with team-shared encryption keys.
 * 
 * Zero external dependencies — pure Node.js built-ins only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Encryption Constants ───────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha512';
const VAULT_HEADER = '# OmniGuild Encrypted Vault v1';
const ENCRYPTED_EXTENSION = '.encrypted';

// ── Key Derivation ─────────────────────────────────────────────────────
/**
 * Derive an AES-256 encryption key from a passphrase using PBKDF2.
 * @param {string} passphrase — master passphrase
 * @param {Buffer} salt — random salt (32 bytes)
 * @returns {Buffer} — 32-byte derived key
 */
function deriveKey(passphrase, salt) {
  return crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
}

// ── Encryption ─────────────────────────────────────────────────────────
/**
 * Encrypt plaintext content using AES-256-GCM.
 * @param {string} plaintext — content to encrypt
 * @param {string} passphrase — master passphrase
 * @returns {{ encrypted: string, salt: string, iv: string, authTag: string }}
 */
function encrypt(plaintext, passphrase) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(passphrase, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt AES-256-GCM encrypted content.
 * @param {string} encryptedContent — base64-encoded ciphertext
 * @param {string} passphrase — master passphrase
 * @param {string} saltB64 — base64-encoded salt
 * @param {string} ivB64 — base64-encoded IV
 * @param {string} authTagB64 — base64-encoded auth tag
 * @returns {string} — decrypted plaintext
 */
function decrypt(encryptedContent, passphrase, saltB64, ivB64, authTagB64) {
  const salt = Buffer.from(saltB64, 'base64');
  const key = deriveKey(passphrase, salt);
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ── .env File Operations ───────────────────────────────────────────────
/**
 * Parse a .env file into key-value pairs.
 */
function parseEnvFile(content) {
  const entries = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      entries.push({ type: 'comment', value: line });
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)/);
    if (match) {
      let value = match[2];
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      entries.push({ type: 'entry', key: match[1], value });
    } else {
      entries.push({ type: 'comment', value: line });
    }
  }

  return entries;
}

/**
 * Serialize parsed env entries back to .env format.
 */
function serializeEnvFile(entries) {
  return entries.map(e => {
    if (e.type === 'comment') return e.value;
    // Quote values with spaces or special characters
    const needsQuotes = /[\s#"'$`\\]/.test(e.value);
    const quotedValue = needsQuotes ? `"${e.value}"` : e.value;
    return `${e.key}=${quotedValue}`;
  }).join('\n');
}

// ── Vault File Format ──────────────────────────────────────────────────
/**
 * Create an encrypted vault file from .env content.
 */
function createVaultFile(envContent, passphrase) {
  const { encrypted, salt, iv, authTag } = encrypt(envContent, passphrase);

  // Calculate content hash for integrity verification
  const contentHash = crypto.createHash('sha256').update(envContent).digest('hex');

  const vaultData = {
    header: VAULT_HEADER,
    version: 1,
    algorithm: ALGORITHM,
    kdf: 'pbkdf2',
    kdfIterations: PBKDF2_ITERATIONS,
    kdfDigest: PBKDF2_DIGEST,
    salt,
    iv,
    authTag,
    contentHash,
    encrypted,
    timestamp: new Date().toISOString(),
    keyCount: parseEnvFile(envContent).filter(e => e.type === 'entry').length,
  };

  return JSON.stringify(vaultData, null, 2);
}

/**
 * Read and decrypt a vault file.
 */
function readVaultFile(vaultContent, passphrase) {
  const vault = JSON.parse(vaultContent);

  if (!vault.encrypted || !vault.salt || !vault.iv || !vault.authTag) {
    throw new Error('Invalid vault file format');
  }

  const decrypted = decrypt(vault.encrypted, passphrase, vault.salt, vault.iv, vault.authTag);

  // Verify content hash
  if (vault.contentHash) {
    const hash = crypto.createHash('sha256').update(decrypted).digest('hex');
    if (hash !== vault.contentHash) {
      throw new Error('Content hash mismatch — vault may be corrupted');
    }
  }

  return decrypted;
}

// ── High-Level Operations ──────────────────────────────────────────────
/**
 * Encrypt a .env file and save as .env.encrypted.
 */
function encryptEnvFile(projectRoot, passphrase, envFileName = '.env') {
  const envPath = path.join(projectRoot, envFileName);
  const vaultPath = envPath + ENCRYPTED_EXTENSION;

  if (!fs.existsSync(envPath)) {
    return {
      success: false,
      message: `File not found: ${envFileName}`,
    };
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const entries = parseEnvFile(content).filter(e => e.type === 'entry');
  
  if (entries.length === 0) {
    return {
      success: false,
      message: `No environment variables found in ${envFileName}`,
    };
  }

  const vaultContent = createVaultFile(content, passphrase);
  fs.writeFileSync(vaultPath, vaultContent, 'utf8');

  // Ensure .env is in .gitignore
  ensureGitignore(projectRoot, envFileName);

  return {
    success: true,
    message: `Encrypted ${entries.length} variables → ${envFileName}${ENCRYPTED_EXTENSION}`,
    keyCount: entries.length,
    vaultPath,
    keys: entries.map(e => e.key), // List key names (not values)
  };
}

/**
 * Decrypt a .env.encrypted file back to .env.
 */
function decryptEnvFile(projectRoot, passphrase, envFileName = '.env') {
  const vaultPath = path.join(projectRoot, envFileName + ENCRYPTED_EXTENSION);

  if (!fs.existsSync(vaultPath)) {
    return {
      success: false,
      message: `Vault file not found: ${envFileName}${ENCRYPTED_EXTENSION}`,
    };
  }

  try {
    const vaultContent = fs.readFileSync(vaultPath, 'utf8');
    const decrypted = readVaultFile(vaultContent, passphrase);
    
    const envPath = path.join(projectRoot, envFileName);
    fs.writeFileSync(envPath, decrypted, 'utf8');

    const entries = parseEnvFile(decrypted).filter(e => e.type === 'entry');
    return {
      success: true,
      message: `Decrypted ${entries.length} variables → ${envFileName}`,
      keyCount: entries.length,
    };
  } catch (err) {
    if (err.message.includes('Unsupported state') || err.message.includes('unable to authenticate')) {
      return {
        success: false,
        message: 'Wrong passphrase — decryption failed (authentication error)',
      };
    }
    return {
      success: false,
      message: `Decryption failed: ${err.message}`,
    };
  }
}

/**
 * Rotate encryption — re-encrypt with a new passphrase.
 */
function rotateKey(projectRoot, oldPassphrase, newPassphrase, envFileName = '.env') {
  const vaultPath = path.join(projectRoot, envFileName + ENCRYPTED_EXTENSION);

  if (!fs.existsSync(vaultPath)) {
    return {
      success: false,
      message: `Vault file not found: ${envFileName}${ENCRYPTED_EXTENSION}`,
    };
  }

  try {
    // Decrypt with old key
    const vaultContent = fs.readFileSync(vaultPath, 'utf8');
    const decrypted = readVaultFile(vaultContent, oldPassphrase);

    // Re-encrypt with new key
    const newVault = createVaultFile(decrypted, newPassphrase);
    fs.writeFileSync(vaultPath, newVault, 'utf8');

    return {
      success: true,
      message: `Key rotated for ${envFileName}${ENCRYPTED_EXTENSION}`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Key rotation failed: ${err.message}`,
    };
  }
}

/**
 * Show which keys changed between two vault snapshots.
 */
function diffVaults(vaultContentA, passphraseA, vaultContentB, passphraseB) {
  const contentA = readVaultFile(vaultContentA, passphraseA);
  const contentB = readVaultFile(vaultContentB, passphraseB);

  const entriesA = new Map(
    parseEnvFile(contentA).filter(e => e.type === 'entry').map(e => [e.key, e.value])
  );
  const entriesB = new Map(
    parseEnvFile(contentB).filter(e => e.type === 'entry').map(e => [e.key, e.value])
  );

  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const [key, value] of entriesB) {
    if (!entriesA.has(key)) {
      added.push(key);
    } else if (entriesA.get(key) !== value) {
      changed.push(key);
    } else {
      unchanged.push(key);
    }
  }

  for (const key of entriesA.keys()) {
    if (!entriesB.has(key)) {
      removed.push(key);
    }
  }

  return { added, removed, changed, unchanged };
}

// ── Helper: Ensure .gitignore ──────────────────────────────────────────
/**
 * Ensure the .env file is listed in .gitignore (but NOT the encrypted version).
 */
function ensureGitignore(projectRoot, envFileName) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  let content = '';

  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
  }

  const linesToAdd = [];
  if (!content.includes(envFileName) || content.includes(`!${envFileName}`)) {
    // Only add if the exact filename isn't already ignored
    if (!content.split('\n').some(l => l.trim() === envFileName)) {
      linesToAdd.push(envFileName);
    }
  }

  if (linesToAdd.length > 0) {
    const addition = '\n# OmniGuild Secrets Vault\n' + linesToAdd.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, content + addition, 'utf8');
  }
}

// ── Report Formatting ──────────────────────────────────────────────────
/**
 * Format vault operation result as Markdown.
 */
function formatVaultReport(operation, result) {
  const lines = [];

  lines.push('# 🔐 OmniGuild Secrets Vault');
  lines.push('');
  lines.push(`## Operation: \`${operation}\``);
  lines.push('');

  if (result.success) {
    lines.push(`✅ **${result.message}**`);
  } else {
    lines.push(`❌ **${result.message}**`);
  }
  lines.push('');

  if (result.keyCount) {
    lines.push(`- **Variables:** ${result.keyCount}`);
  }
  if (result.keys) {
    lines.push('- **Key Names:** ' + result.keys.map(k => `\`${k}\``).join(', '));
  }
  lines.push('');
  lines.push('### Security Notes');
  lines.push('- Encryption: AES-256-GCM (authenticated encryption)');
  lines.push('- Key Derivation: PBKDF2 with 100,000 iterations (SHA-512)');
  lines.push('- The encrypted file is safe to commit to git');
  lines.push('- **Never commit the plaintext .env file**');

  return lines.join('\n');
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Run a vault operation.
 * @param {string} projectRoot — project directory
 * @param {string} operation — 'encrypt' | 'decrypt' | 'rotate' | 'diff'
 * @param {string} passphrase — master passphrase
 * @param {object} options — additional options
 */
function runVault(projectRoot, operation, passphrase, options = {}) {
  const envFileName = options.envFile || '.env';

  let result;
  switch (operation) {
    case 'encrypt':
      result = encryptEnvFile(projectRoot, passphrase, envFileName);
      break;
    case 'decrypt':
      result = decryptEnvFile(projectRoot, passphrase, envFileName);
      break;
    case 'rotate':
      if (!options.newPassphrase) {
        result = { success: false, message: 'New passphrase required for key rotation' };
      } else {
        result = rotateKey(projectRoot, passphrase, options.newPassphrase, envFileName);
      }
      break;
    default:
      result = { success: false, message: `Unknown operation: ${operation}` };
  }

  const report = formatVaultReport(operation, result);
  return { ...result, report };
}

module.exports = {
  runVault,
  encrypt,
  decrypt,
  encryptEnvFile,
  decryptEnvFile,
  rotateKey,
  diffVaults,
  deriveKey,
  parseEnvFile,
  serializeEnvFile,
  createVaultFile,
  readVaultFile,
  formatVaultReport,
  ALGORITHM,
  PBKDF2_ITERATIONS,
};
