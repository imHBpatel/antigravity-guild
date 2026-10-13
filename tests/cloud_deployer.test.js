/**
 * Tests for 1-Click Zero-Config Cloud & Container Deployer
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  generateDockerfile,
  generateDockerCompose,
  generateCloudflareWorker,
  generateVercelConfig,
  generateCiDeployWorkflow,
  generateDeploySpec
} = require('../lib/cloud_deployer');

console.log('🧪 Running Cloud Deployer Tests...');

// 1. Verify Dockerfile generation
const dockerfile = generateDockerfile({ port: 8080, startCmd: 'node server.js' });
assert(dockerfile.includes('FROM node:20-alpine AS builder'));
assert(dockerfile.includes('EXPOSE 8080'));
assert(dockerfile.includes('CMD ["node", "server.js"]'));
assert(dockerfile.includes('USER nodejs'));
console.log('  ✔ Multi-stage Dockerfile generation verified');

// 2. Verify docker-compose.yml generation
const compose = generateDockerCompose({ port: 8080, name: 'my-service' });
assert(compose.includes('my-service:'));
assert(compose.includes('"8080:8080"'));
console.log('  ✔ docker-compose.yml generation verified');

// 3. Verify Cloudflare Worker generation
const cf = generateCloudflareWorker({ name: 'edge-gateway' });
assert(cf.wranglerToml.includes('name = "edge-gateway"'));
assert(cf.workerJs.includes('export default {'));
assert(cf.workerJs.includes('/api/health'));
console.log('  ✔ Cloudflare Worker manifest generation verified');

// 4. Verify Vercel config generation
const vercel = generateVercelConfig();
const parsedVercel = JSON.parse(vercel);
assert.strictEqual(parsedVercel.version, 2);
assert(Array.isArray(parsedVercel.headers));
console.log('  ✔ Vercel security headers manifest verified');

// 5. Verify CI deployment workflow
const ci = generateCiDeployWorkflow({ branch: 'production' });
assert(ci.includes('branches: [ production ]'));
assert(ci.includes('npx antigravity-guild --audit'));
assert(ci.includes('npx antigravity-guild --verify'));
console.log('  ✔ CI/CD verification & deploy workflow verified');

// 6. Test generateDeploySpec in isolated tmp directory
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omniguild-deploy-test-'));
try {
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'tmp-app', version: '1.0.0' }));
  const result = generateDeploySpec(tmpDir, 'all');
  assert.strictEqual(result.success, true);
  assert(result.generatedFiles.includes('Dockerfile'));
  assert(result.generatedFiles.includes('docker-compose.yml'));
  assert(result.generatedFiles.includes('wrangler.toml'));
  assert(result.generatedFiles.includes('worker.js'));
  assert(result.generatedFiles.includes('vercel.json'));
  assert(result.generatedFiles.includes('.github/workflows/deploy.yml'));

  assert(fs.existsSync(path.join(tmpDir, 'Dockerfile')));
  assert(fs.existsSync(path.join(tmpDir, 'vercel.json')));
  console.log('  ✔ End-to-end deploy spec synthesis verified');
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log('✨ All Cloud Deployer Tests Passed!\n');
