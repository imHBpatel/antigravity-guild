'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { extractInternalDependencies, generateMermaidDiagram, generateArchitectureDocs } = require('../lib/doc_architect');

console.log('🧪 Running Living Architecture Documentation Tests...');

// 1. Internal Dependency Extraction
{
  const sampleCode = `
    const { foo } = require('./foo');
    const bar = require('../lib/bar.js');
    import baz from './baz';
    const external = require('express');
  `;
  const deps = extractInternalDependencies(sampleCode, '/project/lib/sample.js');
  assert.ok(deps.includes('foo'), 'Should include ./foo');
  assert.ok(deps.includes('bar'), 'Should include ../lib/bar');
  assert.ok(deps.includes('baz'), 'Should include ./baz');
  assert.ok(!deps.includes('express'), 'Should not include external dependency express');
  console.log('  ✔ Internal module dependency extraction verified');
}

// 2. Mermaid Topology Diagram Generation
{
  const mockModules = [
    { name: 'auth', deps: ['db', 'crypto_utils'] },
    { name: 'db', deps: ['config'] }
  ];
  const diagram = generateMermaidDiagram(mockModules);
  assert.ok(diagram.includes('```mermaid'), 'Should contain mermaid code block');
  assert.ok(diagram.includes('flowchart TD'), 'Should specify flowchart TD');
  assert.ok(diagram.includes('auth --> db'), 'Should contain auth --> db dependency edge');
  console.log('  ✔ Mermaid topology diagram generation verified');
}

// 3. Full Architecture Blueprint Synthesis
{
  const workspaceRoot = path.resolve(__dirname, '..');
  const result = generateArchitectureDocs(workspaceRoot, { write: false, maxFiles: 10 });

  assert.ok(result.modulesCount > 0, 'Should analyze modules in workspace');
  assert.ok(result.symbolsCount > 0, 'Should extract AST symbols');
  assert.ok(result.markdown.includes('# 🏛️ Architecture & System Blueprint:'), 'Markdown should contain title header');
  assert.ok(result.markdown.includes('## 🌐 Visual System Dependency Topology'), 'Should contain topology section');
  assert.ok(result.markdown.includes('## 📦 Subsystems & Module Inventory'), 'Should contain module inventory table');
  assert.ok(result.markdown.includes('## 📑 Public API & Symbol Reference'), 'Should contain API reference table');
  console.log('  ✔ Full architecture blueprint synthesis verified');
}

console.log('✨ All Living Architecture Documentation Tests Passed!\n');
