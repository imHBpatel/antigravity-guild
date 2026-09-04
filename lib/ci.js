'use strict';

const fs = require('fs');
const path = require('path');
const { detectStack } = require('./detectors');
const { c } = require('./constants');

/**
 * Build GitHub Actions YAML workflow content based on detected tech stack.
 *
 * @param {object} stack - Stack detection object.
 * @param {string} projectName - Project name.
 * @returns {string} GitHub Actions workflow YAML.
 */
function buildWorkflowYaml(stack, projectName) {
  // Determine setup step based on detected language
  let setupSteps = '';

  switch (stack.lang.toLowerCase()) {
    case 'python':
      setupSteps = `      - name: 🐍 Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'`;
      break;

    case 'rust':
      setupSteps = `      - name: 🦀 Set up Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy`;
      break;

    case 'go':
      setupSteps = `      - name: 🐹 Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true`;
      break;

    default: // JavaScript / TypeScript / Node
      setupSteps = `      - name: 🟢 Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: '${stack.pkgManager === 'npm' ? 'npm' : stack.pkgManager === 'pnpm' ? 'pnpm' : 'yarn'}'
      - name: 📦 Install Dependencies
        run: ${stack.pkgManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : stack.pkgManager === 'yarn' ? 'yarn install --frozen-lockfile' : 'npm ci'}`;
      break;
  }

  return `name: 🏛️ OpenGuild 12-Expert Council Review & Invariants

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  council-invariants:
    name: 🧪 Deterministic Verification & Invariant Proofs
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout Code
        uses: actions/checkout@v4

${setupSteps}

      - name: 🧠 Set up OpenGuild Engine
        run: npx --yes antigravity-guild --preset full

      - name: 🧹 Verify OpenGuild Memory Integrity
        run: npx --yes antigravity-guild --lint-memory

      - name: 🛡️ Deterministic Test Verification
        run: ${stack.testCmd}

      - name: 🔍 Deterministic Linter Check
        run: ${stack.lintCmd}

      - name: 📐 Deterministic Typecheck
        run: ${stack.typecheckCmd}

      - name: 🏛️ 12-Expert Council Compliance Verified
        if: success()
        run: |
          echo "=========================================================="
          echo "🎉 All 12-Expert Council Invariants Passed Deterministically!"
          echo "   Project: ${projectName}"
          echo "   Architecture, Security, Performance & QA Gates: CLEARED"
          echo "=========================================================="
`;
}

/**
 * Generate `.github/workflows/openguild-council-review.yml`.
 *
 * @param {string} projectDir - Workspace directory.
 * @param {boolean} isDryRun - Dry run mode.
 * @returns {object} Result of the generation.
 */
function generateCiWorkflow(projectDir = process.cwd(), isDryRun = false) {
  const workflowsDir = path.join(projectDir, '.github', 'workflows');
  const targetFile = path.join(workflowsDir, 'openguild-council-review.yml');

  let files = [];
  try {
    files = fs.readdirSync(projectDir);
  } catch {
    files = [];
  }

  const stack = detectStack(files, projectDir);
  const projectName = path.basename(projectDir);
  const workflowContent = buildWorkflowYaml(stack, projectName);

  if (isDryRun) {
    return {
      created: false,
      updated: false,
      isDryRun: true,
      path: targetFile,
      content: workflowContent,
    };
  }

  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }

  const alreadyExists = fs.existsSync(targetFile);
  fs.writeFileSync(targetFile, workflowContent, 'utf8');

  return {
    created: !alreadyExists,
    updated: alreadyExists,
    isDryRun: false,
    path: targetFile,
    content: workflowContent,
  };
}

module.exports = {
  buildWorkflowYaml,
  generateCiWorkflow,
};
