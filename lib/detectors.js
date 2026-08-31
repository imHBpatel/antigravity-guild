'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Universal Stack and Workspace Detector.
 * Safely inspects workspace files to determine language, framework,
 * package manager, monorepo setup, and verification commands.
 *
 * @param {string[]} files - Array of filenames in the root directory.
 * @param {string} projectDir - Absolute path to the workspace root.
 * @returns {object} Detected stack metadata and verification invariants.
 */
function detectStack(files, projectDir) {
  const result = {
    lang: 'Polyglot / Generic',
    framework: 'Standard',
    pkgManager: 'npm',
    isMonorepo: false,
    monorepoTool: null,
    testCmd: 'echo "No test runner configured"',
    lintCmd: 'echo "No linter configured"',
    typecheckCmd: 'echo "No typechecker configured"',
  };

  // 0. Monorepo Detection
  if (files.includes('turbo.json')) {
    result.isMonorepo = true;
    result.monorepoTool = 'Turborepo';
  } else if (files.includes('nx.json')) {
    result.isMonorepo = true;
    result.monorepoTool = 'Nx';
  } else if (files.includes('pnpm-workspace.yaml')) {
    result.isMonorepo = true;
    result.monorepoTool = 'pnpm Workspaces';
  } else if (files.includes('lerna.json')) {
    result.isMonorepo = true;
    result.monorepoTool = 'Lerna';
  }

  // 1. JavaScript / TypeScript Ecosystem
  if (files.includes('package.json')) {
    try {
      const raw = fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw);
      const isTs = files.includes('tsconfig.json');
      result.lang = isTs ? 'TypeScript' : 'JavaScript';

      // Package manager detection
      if (files.includes('pnpm-lock.yaml')) result.pkgManager = 'pnpm';
      else if (files.includes('yarn.lock')) result.pkgManager = 'yarn';
      else if (files.includes('bun.lockb') || files.includes('bun.lock')) result.pkgManager = 'bun';
      else result.pkgManager = 'npm';

      // Framework detection
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps['next']) result.framework = 'Next.js';
      else if (deps['@remix-run/node'] || deps['@remix-run/react']) result.framework = 'Remix';
      else if (deps['astro']) result.framework = 'Astro';
      else if (deps['@sveltejs/kit']) result.framework = 'SvelteKit';
      else if (deps['nuxt']) result.framework = 'Nuxt';
      else if (deps['@angular/core']) result.framework = 'Angular';
      else if (deps['react']) result.framework = 'React';
      else if (deps['vue']) result.framework = 'Vue';
      else if (deps['svelte']) result.framework = 'Svelte';
      else if (deps['@nestjs/core']) result.framework = 'NestJS';
      else if (deps['express']) result.framework = 'Express';
      else if (deps['fastify']) result.framework = 'Fastify';
      else if (deps['hono']) result.framework = 'Hono';
      else if (deps['electron']) result.framework = 'Electron';
      else if (deps['react-native']) result.framework = 'React Native';

      // Tool commands
      if (result.isMonorepo && result.monorepoTool === 'Turborepo') {
        result.testCmd = `${result.pkgManager} run test`;
        result.lintCmd = `${result.pkgManager} run lint`;
        result.typecheckCmd = `${result.pkgManager} run check-types || ${result.pkgManager} run typecheck`;
      } else {
        if (pkg.scripts?.test) result.testCmd = `${result.pkgManager} test`;
        if (pkg.scripts?.lint) result.lintCmd = `${result.pkgManager} run lint`;
        if (pkg.scripts?.typecheck) result.typecheckCmd = `${result.pkgManager} run typecheck`;
        else if (isTs) result.typecheckCmd = `${result.pkgManager} run tsc --noEmit || npx tsc --noEmit`;
      }
    } catch {
      // Fallback if package.json is malformed
    }
  }

  // 2. Python Ecosystem
  else if (files.includes('pyproject.toml') || files.includes('requirements.txt') || files.includes('Pipfile')) {
    result.lang = 'Python';
    result.pkgManager = files.includes('uv.lock') ? 'uv'
      : files.includes('poetry.lock') ? 'poetry'
      : files.includes('Pipfile') ? 'pipenv'
      : 'pip';

    if (result.pkgManager === 'uv') {
      result.testCmd = 'uv run pytest';
      result.lintCmd = 'uv run ruff check .';
      result.typecheckCmd = 'uv run mypy .';
    } else if (result.pkgManager === 'poetry') {
      result.testCmd = 'poetry run pytest';
      result.lintCmd = 'poetry run ruff check . || poetry run flake8';
      result.typecheckCmd = 'poetry run mypy .';
    } else {
      result.testCmd = 'pytest -v';
      result.lintCmd = 'ruff check . || flake8';
      result.typecheckCmd = 'mypy .';
    }

    try {
      const content = files.includes('pyproject.toml')
        ? fs.readFileSync(path.join(projectDir, 'pyproject.toml'), 'utf8')
        : files.includes('requirements.txt')
        ? fs.readFileSync(path.join(projectDir, 'requirements.txt'), 'utf8')
        : '';

      if (/django/i.test(content)) result.framework = 'Django';
      else if (/fastapi/i.test(content)) result.framework = 'FastAPI';
      else if (/flask/i.test(content)) result.framework = 'Flask';
      else if (/torch/i.test(content)) result.framework = 'PyTorch AI';
      else if (/tensorflow/i.test(content)) result.framework = 'TensorFlow';
    } catch { /* non-critical */ }
  }

  // 3. Rust Ecosystem
  else if (files.includes('Cargo.toml')) {
    result.lang = 'Rust';
    result.pkgManager = 'cargo';
    result.testCmd = 'cargo test';
    result.lintCmd = 'cargo clippy';
    result.typecheckCmd = 'cargo check';

    try {
      const content = fs.readFileSync(path.join(projectDir, 'Cargo.toml'), 'utf8');
      if (/\[workspace\]/.test(content)) {
        result.isMonorepo = true;
        result.monorepoTool = 'Cargo Workspace';
      }
      if (/axum/i.test(content)) result.framework = 'Axum';
      else if (/actix-web/i.test(content)) result.framework = 'Actix-web';
      else if (/tokio/i.test(content)) result.framework = 'Tokio Async';
      else if (/tauri/i.test(content)) result.framework = 'Tauri';
    } catch { /* non-critical */ }
  }

  // 4. Go Ecosystem
  else if (files.includes('go.mod')) {
    result.lang = 'Go';
    result.pkgManager = 'go';
    result.testCmd = 'go test ./...';
    result.lintCmd = 'golangci-lint run || go vet ./...';
    result.typecheckCmd = 'go vet ./...';

    try {
      const content = fs.readFileSync(path.join(projectDir, 'go.mod'), 'utf8');
      if (/github\.com\/gin-gonic\/gin/i.test(content)) result.framework = 'Gin';
      else if (/github\.com\/gofiber\/fiber/i.test(content)) result.framework = 'Fiber';
      else if (/github\.com\/labstack\/echo/i.test(content)) result.framework = 'Echo';
    } catch { /* non-critical */ }
  }

  // 5. Mobile: Flutter / Dart
  else if (files.includes('pubspec.yaml')) {
    result.lang = 'Dart';
    result.framework = 'Flutter';
    result.pkgManager = 'flutter';
    result.testCmd = 'flutter test';
    result.lintCmd = 'flutter analyze';
    result.typecheckCmd = 'dart analyze';
  }

  // 6. Apple / Swift Ecosystem
  else if (files.includes('Package.swift') || files.some(f => f.endsWith('.xcodeproj') || f.endsWith('.xcworkspace'))) {
    result.lang = 'Swift';
    result.framework = 'Apple Native / SwiftUI';
    result.pkgManager = 'swift';
    result.testCmd = 'swift test';
    result.lintCmd = 'swiftlint || echo "No swiftlint configured"';
    result.typecheckCmd = 'swift build';
  }

  // 7. C# / .NET Ecosystem
  else if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln') || f.endsWith('.fsproj'))) {
    result.lang = 'C# / .NET';
    result.pkgManager = 'dotnet';
    result.testCmd = 'dotnet test';
    result.lintCmd = 'dotnet format --verify-no-changes';
    result.typecheckCmd = 'dotnet build --no-restore';
  }

  // 8. Java / Kotlin Ecosystem
  else if (files.includes('build.gradle') || files.includes('build.gradle.kts') || files.includes('pom.xml')) {
    const isMaven = files.includes('pom.xml');
    result.lang = files.includes('build.gradle.kts') ? 'Kotlin' : 'Java';
    result.pkgManager = isMaven ? 'maven' : 'gradle';
    result.testCmd = isMaven ? 'mvn test' : './gradlew test';
    result.lintCmd = isMaven ? 'mvn checkstyle:check' : './gradlew check';
    result.typecheckCmd = isMaven ? 'mvn compile' : './gradlew compileJava';

    try {
      const gradleFile = files.includes('build.gradle.kts') ? 'build.gradle.kts' : 'build.gradle';
      const content = isMaven
        ? fs.readFileSync(path.join(projectDir, 'pom.xml'), 'utf8')
        : fs.readFileSync(path.join(projectDir, gradleFile), 'utf8');

      if (/spring-boot/i.test(content)) result.framework = 'Spring Boot';
      else if (/com\.android/i.test(content)) result.framework = 'Android Native';
      else if (/quarkus/i.test(content)) result.framework = 'Quarkus';
    } catch { /* non-critical */ }
  }

  // 9. C / C++
  else if (files.includes('CMakeLists.txt') || files.includes('Makefile')) {
    result.lang = 'C / C++';
    result.pkgManager = files.includes('CMakeLists.txt') ? 'cmake' : 'make';
    result.testCmd = files.includes('CMakeLists.txt') ? 'ctest --output-on-failure' : 'make test';
    result.lintCmd = 'clang-tidy -p . || echo "No clang-tidy configured"';
    result.typecheckCmd = files.includes('CMakeLists.txt') ? 'cmake --build build' : 'make';
  }

  // 10. PHP Ecosystem
  else if (files.includes('composer.json')) {
    result.lang = 'PHP';
    result.pkgManager = 'composer';
    result.testCmd = 'composer test || ./vendor/bin/phpunit';
    result.lintCmd = './vendor/bin/phpcs || ./vendor/bin/pint';
    result.typecheckCmd = './vendor/bin/phpstan analyse';

    try {
      const content = fs.readFileSync(path.join(projectDir, 'composer.json'), 'utf8');
      if (/laravel\/framework/i.test(content)) result.framework = 'Laravel';
      else if (/symfony\/framework-bundle/i.test(content)) result.framework = 'Symfony';
    } catch { /* non-critical */ }
  }

  return result;
}

module.exports = {
  detectStack,
};
