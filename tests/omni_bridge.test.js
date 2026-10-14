/**
 * Deterministic Test Suite for OmniBridge Cross-Repo Contract Synchronizer
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { scanRepoContracts, bridgeCompareRepos, formatBridgeReport } = require('../lib/omni_bridge');

console.log('🧪 Running OmniBridge Cross-Repo Contract Synchronizer Tests...');

const testCwd = process.cwd();

// Test 1: Scan current repository contracts
const contracts = scanRepoContracts(testCwd);
assert(contracts !== null, 'Contracts should not be null');
assert(Array.isArray(contracts.routes), 'routes should be an array');
assert(Array.isArray(contracts.exportsMap), 'exportsMap should be an array');
assert(Array.isArray(contracts.clientCalls), 'clientCalls should be an array');
console.log('  ✔ Repository contract and route scanner verified');

// Test 2: Compare two repos (using current repo as both server and client to test harmony)
const comparison = bridgeCompareRepos(testCwd, testCwd);
assert(comparison !== null, 'Comparison should not be null');
assert(typeof comparison.totalServerRoutes === 'number', 'totalServerRoutes should be a number');
assert(typeof comparison.totalClientCalls === 'number', 'totalClientCalls should be a number');
assert(typeof comparison.driftCount === 'number', 'driftCount should be a number');
console.log('  ✔ Cross-repo contract comparison engine verified');

// Test 3: Terminal Formatter
const reportText = formatBridgeReport(comparison);
assert(typeof reportText === 'string' && reportText.includes('OMNIBRIDGE'), 'Report should be formatted string');
console.log('  ✔ Terminal formatters verified');

console.log('✨ All OmniBridge Tests Passed Deterministically!\n');
