'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  packMemoryArchive,
  unpackMemoryArchive,
  startSyncServer,
  pullFromRemote,
  pushToRemote
} = require('../lib/team_sync_server');

console.log('🧪 Running Zero-Dependency Team Brain Sync Server Tests...');

async function runTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-sync-'));
  const teamDir = path.join(tempDir, '.openguild');
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(path.join(teamDir, 'team_memory.md'), '- [2026-09-15] Test sync memory\n', 'utf8');

  // 1. Pack & Unpack Archive Verification
  {
    const archive = packMemoryArchive(tempDir);
    assert.strictEqual(archive.schemaVersion, '2.0.0');
    assert.ok(archive.teamDocuments['team_memory.md'], 'Should pack team memory');

    const destDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-sync-dest-'));
    const unpackRes = unpackMemoryArchive(archive, destDir);
    assert.ok(unpackRes.teamCount > 0, 'Should unpack team documents');
    assert.ok(fs.existsSync(path.join(destDir, '.openguild', 'team_memory.md')));
    fs.rmSync(destDir, { recursive: true, force: true });
    console.log('  ✔ Memory archive packing and unpacking verified');
  }

  // 2. HTTP Server Start, Health, and Client Pull/Push Verification
  {
    const testPort = 54321;
    const serverInstance = await startSyncServer({ port: testPort, cwd: tempDir });
    assert.ok(serverInstance.url.includes('54321'), 'Server URL should contain port 54321');

    try {
      // Pull test
      const clientDest = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-client-'));
      const pullRes = await pullFromRemote(serverInstance.url, { cwd: clientDest });
      assert.strictEqual(pullRes.success, true, 'Pull should succeed');
      assert.ok(fs.existsSync(path.join(clientDest, '.openguild', 'team_memory.md')), 'Pulled memory should exist on disk');

      // Push test
      fs.writeFileSync(path.join(clientDest, '.openguild', 'pushed_rule.md'), '- Pushed test rule\n', 'utf8');
      const pushRes = await pushToRemote(serverInstance.url, { cwd: clientDest });
      assert.strictEqual(pushRes.success, true, 'Push should succeed');

      fs.rmSync(clientDest, { recursive: true, force: true });
      console.log('  ✔ HTTP Server lifecycle, client pull, and push round-trip verified');
    } finally {
      await serverInstance.close();
    }
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✨ All Team Brain Sync Server Tests Passed!\n');
}

runTests().catch(err => {
  console.error('✖ Test failed:', err);
  process.exit(1);
});
