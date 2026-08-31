'use strict';

const assert = require('assert');
const { detectStack } = require('../lib/detectors');

console.log('🧪 Running Stack Detector Unit Tests...');

// 1. Next.js TypeScript project
{
  const files = ['package.json', 'tsconfig.json', 'pnpm-lock.yaml'];
  // Mock directory with package.json
  const fs = require('fs');
  const path = require('path');
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'openguild-test-'));
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'my-next-app',
    dependencies: { next: '14.0.0', react: '18.0.0' },
    scripts: { test: 'jest', lint: 'next lint' }
  }));
  fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
  fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');

  const result = detectStack(['package.json', 'tsconfig.json', 'pnpm-lock.yaml'], tmpDir);
  assert.strictEqual(result.lang, 'TypeScript');
  assert.strictEqual(result.framework, 'Next.js');
  assert.strictEqual(result.pkgManager, 'pnpm');
  assert.strictEqual(result.testCmd, 'pnpm test');
  assert.strictEqual(result.lintCmd, 'pnpm run lint');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Next.js + TypeScript + pnpm passed');
}

// 2. Python FastAPI with uv
{
  const files = ['pyproject.toml', 'uv.lock'];
  const fs = require('fs');
  const path = require('path');
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'openguild-py-'));
  fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname="api"\ndependencies=["fastapi", "uvicorn"]');
  fs.writeFileSync(path.join(tmpDir, 'uv.lock'), '');

  const result = detectStack(['pyproject.toml', 'uv.lock'], tmpDir);
  assert.strictEqual(result.lang, 'Python');
  assert.strictEqual(result.framework, 'FastAPI');
  assert.strictEqual(result.pkgManager, 'uv');
  assert.strictEqual(result.testCmd, 'uv run pytest');
  assert.strictEqual(result.lintCmd, 'uv run ruff check .');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Python + FastAPI + uv passed');
}

// 3. Rust with Cargo
{
  const fs = require('fs');
  const path = require('path');
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'openguild-rs-'));
  fs.writeFileSync(path.join(tmpDir, 'Cargo.toml'), '[package]\nname="server"\n[dependencies]\naxum="0.7"');

  const result = detectStack(['Cargo.toml'], tmpDir);
  assert.strictEqual(result.lang, 'Rust');
  assert.strictEqual(result.framework, 'Axum');
  assert.strictEqual(result.pkgManager, 'cargo');
  assert.strictEqual(result.testCmd, 'cargo test');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Rust + Axum + Cargo passed');
}

// 4. Go modules with Gin
{
  const fs = require('fs');
  const path = require('path');
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'openguild-go-'));
  fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module myapp\nrequire github.com/gin-gonic/gin v1.9.0');

  const result = detectStack(['go.mod'], tmpDir);
  assert.strictEqual(result.lang, 'Go');
  assert.strictEqual(result.framework, 'Gin');
  assert.strictEqual(result.pkgManager, 'go');
  assert.strictEqual(result.testCmd, 'go test ./...');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Go + Gin passed');
}

// 5. Flutter / Dart
{
  const result = detectStack(['pubspec.yaml'], '/fake/path');
  assert.strictEqual(result.lang, 'Dart');
  assert.strictEqual(result.framework, 'Flutter');
  assert.strictEqual(result.pkgManager, 'flutter');
  assert.strictEqual(result.testCmd, 'flutter test');
  console.log('  ✔ Flutter / Dart passed');
}

// 6. Swift / iOS
{
  const result = detectStack(['Package.swift'], '/fake/path');
  assert.strictEqual(result.lang, 'Swift');
  assert.strictEqual(result.pkgManager, 'swift');
  assert.strictEqual(result.testCmd, 'swift test');
  console.log('  ✔ Swift / Apple Native passed');
}

// 7. Turborepo Monorepo Detection
{
  const fs = require('fs');
  const path = require('path');
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'openguild-turbo-'));
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'monorepo' }));
  fs.writeFileSync(path.join(tmpDir, 'turbo.json'), '{}');

  const result = detectStack(['package.json', 'turbo.json'], tmpDir);
  assert.strictEqual(result.isMonorepo, true);
  assert.strictEqual(result.monorepoTool, 'Turborepo');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✔ Turborepo Monorepo passed');
}

console.log('✨ All Stack Detector Tests Passed!\n');
