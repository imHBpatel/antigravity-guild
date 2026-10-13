'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  encrypt, decrypt, deriveKey, parseEnvFile, serializeEnvFile,
  createVaultFile, readVaultFile, encryptEnvFile, decryptEnvFile,
  ALGORITHM, PBKDF2_ITERATIONS,
} = require('../lib/secrets_vault');

console.log('  ⏱ secrets_vault.test.js');

const PASSPHRASE = 'test-master-key-2026!';

// Test 1: Encrypt/decrypt roundtrip
const plaintext = 'DATABASE_URL=postgres://localhost:5432/mydb\nAPI_KEY=sk-12345';
const encrypted = encrypt(plaintext, PASSPHRASE);
assert.ok(encrypted.encrypted, 'Should produce encrypted output');
assert.ok(encrypted.salt, 'Should include salt');
assert.ok(encrypted.iv, 'Should include IV');
assert.ok(encrypted.authTag, 'Should include auth tag');

const decrypted = decrypt(encrypted.encrypted, PASSPHRASE, encrypted.salt, encrypted.iv, encrypted.authTag);
assert.strictEqual(decrypted, plaintext, 'Decrypted text should match original');

// Test 2: Wrong passphrase should fail
try {
  decrypt(encrypted.encrypted, 'wrong-passphrase', encrypted.salt, encrypted.iv, encrypted.authTag);
  assert.fail('Should throw on wrong passphrase');
} catch (err) {
  assert.ok(err, 'Should throw error for wrong passphrase');
}

// Test 3: Parse .env file
const envContent = `# Database config\nDB_HOST=localhost\nDB_PORT=5432\nDB_NAME="my database"\nAPI_KEY='secret-key'`;
const entries = parseEnvFile(envContent);
const envEntries = entries.filter(e => e.type === 'entry');
assert.strictEqual(envEntries.length, 4, 'Should parse 4 env entries');
assert.strictEqual(envEntries[0].key, 'DB_HOST');
assert.strictEqual(envEntries[0].value, 'localhost');
assert.strictEqual(envEntries[2].value, 'my database', 'Should strip quotes');

// Test 4: Serialize env back
const serialized = serializeEnvFile(entries);
assert.ok(serialized.includes('DB_HOST=localhost'), 'Should serialize entries');

// Test 5: Vault file roundtrip
const vaultContent = createVaultFile(plaintext, PASSPHRASE);
assert.ok(vaultContent.includes('OmniGuild Encrypted Vault'), 'Should have vault header');
const decryptedVault = readVaultFile(vaultContent, PASSPHRASE);
assert.strictEqual(decryptedVault, plaintext, 'Vault roundtrip should preserve content');

// Test 6: Full file encrypt/decrypt roundtrip
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-vault-'));
fs.writeFileSync(path.join(tmpDir, '.env'), 'SECRET=hello\nTOKEN=world\n');

const encResult = encryptEnvFile(tmpDir, PASSPHRASE);
assert.ok(encResult.success, 'Encryption should succeed');
assert.strictEqual(encResult.keyCount, 2, 'Should encrypt 2 keys');
assert.ok(fs.existsSync(path.join(tmpDir, '.env.encrypted')), 'Should create .env.encrypted');

// Delete .env and decrypt
fs.unlinkSync(path.join(tmpDir, '.env'));
const decResult = decryptEnvFile(tmpDir, PASSPHRASE);
assert.ok(decResult.success, 'Decryption should succeed');
assert.ok(fs.existsSync(path.join(tmpDir, '.env')), 'Should restore .env');

const restored = fs.readFileSync(path.join(tmpDir, '.env'), 'utf8');
assert.ok(restored.includes('SECRET=hello'), 'Restored .env should have correct content');

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('  ✅ secrets_vault: All tests passed');
