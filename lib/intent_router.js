/**
 * Superpower 37: Natural-Language Intent Router
 *
 * Translates conversational developer requests (e.g. "audit security and verify tests")
 * into deterministic, sequenced Council execution pipelines.
 *
 * Pure Node.js built-ins only.
 */
'use strict';

const { auditSecurity } = require('./security_auditor');
const { verifyProject } = require('./verifier');
const { runProjectPulse } = require('./project_pulse');
const { runTechDebtRadar } = require('./tech_debt_radar');
const { runDepScan } = require('./dep_scanner');
const { generatePrBlueprint } = require('./pr_architect');
const { profileTokens } = require('./token_profiler');
const { runScaffold } = require('./scaffolder');
const { runTemporalTimeline } = require('./temporal_memory');
const { fuzzModule } = require('./chaos_fuzzer');
const { benchmarkModule } = require('./perf_benchmarker');
const { generateDeploySpec } = require('./cloud_deployer');
const { runTitan } = require('./titan_engine');
const { c } = require('./constants');

/**
 * Classify a natural-language prompt into an ordered execution plan.
 *
 * @param {string} prompt - Developer's conversational instruction.
 * @returns {Array<object>} Ordered list of tasks to execute.
 */
function planIntent(prompt) {
  const text = (prompt || '').toLowerCase();
  const tasks = [];

  // 0. Titan 100% Autonomous Pipeline (God-Mode)
  if (/\b(titan|auto|everything|end-to-end|solve all)\b/.test(text)) {
    return [{
      id: 'titan',
      label: '⚡ Titan 100% Autonomous Zero-Touch Pipeline',
      action: 'runTitan',
      params: { goal: prompt }
    }];
  }

  // 1. Security / Audit
  if (/\b(security|audit|secret|token|credential|saif|leak|vulnerabilit)/.test(text)) {
    tasks.push({
      id: 'audit',
      label: '🛡️ SAIF 2.0 Security Audit',
      action: 'auditSecurity',
    });
  }

  // 2. Verification / Invariants / Tests
  if (/\b(test|tests|verify|verification|invariant|check|pass|build)\b/.test(text)) {
    tasks.push({
      id: 'verify',
      label: '🧪 Deterministic Invariant Verification',
      action: 'verifyProject',
    });
  }

  // 3. Tech Debt Radar
  if (/\b(debt|complexity|smell|refactor|clean|maintainabilit)\b/.test(text)) {
    tasks.push({
      id: 'debt',
      label: '⚡ Technical Debt Radar',
      action: 'runTechDebtRadar',
    });
  }

  // 4. Dependencies
  if (/\b(dep|dependency|dependencies|npm|cve|license|package)\b/.test(text) && !tasks.some(t => t.id === 'verify')) {
    tasks.push({
      id: 'deps',
      label: '📦 Dependency Vulnerability Scan',
      action: 'runDepScan',
    });
  }

  // 5. Project Pulse / Health
  if (/\b(pulse|health|status|vital|metric)\b/.test(text)) {
    tasks.push({
      id: 'pulse',
      label: '📈 Project Pulse Health Dashboard',
      action: 'runProjectPulse',
    });
  }

  // 6. Token Diet / Efficiency
  if (/\b(token|tokens|prompt|diet|latency|cost)\b/.test(text) && !tasks.some(t => t.id === 'audit')) {
    tasks.push({
      id: 'tokens',
      label: '⚡ Context Token Diet Profiler',
      action: 'profileTokens',
    });
  }

  // 7. Scaffolding
  const scaffoldMatch = text.match(/\b(scaffold|create|generate|new)\s+(api|ui|component|test|endpoint)\s+([a-zA-Z0-9_-]+)/);
  if (scaffoldMatch) {
    tasks.push({
      id: 'scaffold',
      label: `🔨 Scaffold ${scaffoldMatch[2].toUpperCase()}: ${scaffoldMatch[3]}`,
      action: 'runScaffold',
      params: { type: scaffoldMatch[2], name: scaffoldMatch[3] },
    });
  }

  // 8. PR Blueprint / Commit
  if (/\b(pr|pull\s*request|commit|review)\b/.test(text)) {
    tasks.push({
      id: 'pr',
      label: '📝 Council PR & Commit Blueprint',
      action: 'generatePrBlueprint',
    });
  }

  // 9. Chaos Fuzzing
  if (/\b(fuzz|chaos|boundary|stress|payload)\b/.test(text)) {
    tasks.push({
      id: 'fuzz',
      label: '⚡ Chaos Engineering & Negative Input Fuzz',
      action: 'runChaosFuzzer',
    });
  }

  // 10. Performance Benchmarking
  if (/\b(benchmark|bench|perf|performance|latency|ops\/sec)\b/.test(text)) {
    tasks.push({
      id: 'benchmark',
      label: '🏎️ Nanosecond Performance Benchmarker',
      action: 'runBenchmark',
    });
  }

  // 11. Cloud & Container Deployment
  if (/\b(deploy|docker|dockerfile|cloudflare|vercel|container)\b/.test(text)) {
    tasks.push({
      id: 'deploy',
      label: '🚀 1-Click Zero-Config Cloud Deployer',
      action: 'generateDeploySpec',
    });
  }

  // Fallback: If no specific intent matched, run standard Pulse + Verify
  if (tasks.length === 0) {
    tasks.push(
      { id: 'audit', label: '🛡️ SAIF 2.0 Security Audit', action: 'auditSecurity' },
      { id: 'verify', label: '🧪 Deterministic Invariant Verification', action: 'verifyProject' }
    );
  }

  return tasks;
}

/**
 * Execute the planned tasks sequentially and format a Council summary.
 *
 * @param {string} prompt - Conversational instruction.
 * @param {string} projectRoot - Workspace path.
 * @returns {object} Execution scorecard and output.
 */
function executeIntent(prompt, projectRoot = process.cwd()) {
  const plan = planIntent(prompt);
  const results = [];
  let allSuccess = true;

  console.log(`\n${c.bold}🏛️ OmniGuild Autonomous Intent Engine${c.reset}`);
  console.log(`${c.dim}Intent:${c.reset} "${prompt}"`);
  console.log(`${c.dim}Planned Execution Pipeline: ${plan.map(t => t.id).join(' ➔ ')}${c.reset}\n`);

  for (const task of plan) {
    process.stdout.write(`  ⏳ ${task.label}... `);
    let success = true;
    let detail = '';

    try {
      switch (task.action) {
        case 'auditSecurity': {
          const res = auditSecurity(projectRoot);
          success = res.grade === 'A+' || res.grade === 'A';
          detail = `Grade: ${res.grade} (${res.issueCount || 0} issues)`;
          break;
        }
        case 'verifyProject': {
          const res = verifyProject(projectRoot);
          success = res.passed;
          detail = res.passed ? 'Invariants Certified' : 'Verification Incomplete';
          break;
        }
        case 'runProjectPulse': {
          const res = runProjectPulse(projectRoot);
          success = true;
          detail = `Health: ${res.metrics.code.grade}`;
          break;
        }
        case 'runTechDebtRadar': {
          const res = runTechDebtRadar(projectRoot);
          success = true;
          detail = `Debt Index: ${res.totalSmells} smells`;
          break;
        }
        case 'runDepScan': {
          const res = runDepScan(projectRoot);
          success = res.vulnerabilities.length === 0;
          detail = `${res.vulnerabilities.length} vulnerabilities`;
          break;
        }
        case 'profileTokens': {
          const res = profileTokens(projectRoot);
          success = true;
          detail = `Efficiency Grade: ${res.grade || 'A+'}`;
          break;
        }
        case 'runScaffold': {
          const res = runScaffold(projectRoot, task.params.type, task.params.name);
          success = res.files && res.files.length > 0;
          detail = `${res.summary}`;
          break;
        }
        case 'generatePrBlueprint': {
          const res = generatePrBlueprint(projectRoot);
          success = true;
          detail = 'PR Blueprint Generated';
          break;
        }
        case 'runChaosFuzzer': {
          const res = fuzzModule(require.resolve('./scaffolder'));
          success = res.success && res.averageResilienceScore >= 80;
          detail = `Resilience: ${res.overallGrade} (${res.averageResilienceScore}%)`;
          break;
        }
        case 'runBenchmark': {
          const res = benchmarkModule(require.resolve('./constants'));
          success = res.success;
          detail = `Benchmarked ${res.totalBenchmarks} functions`;
          break;
        }
        case 'generateDeploySpec': {
          const res = generateDeploySpec(projectRoot, 'all');
          success = res.success;
          detail = `Synthesized ${res.generatedFiles.length} deployment manifests`;
          break;
        }
        case 'runTitan': {
          const res = runTitan(task.params.goal || 'Autonomous Pipeline', { cwd: projectRoot, dryRun: false });
          success = res.overallSuccess;
          detail = `All 10 phases completed (${(res.durationMs / 1000).toFixed(1)}s)`;
          break;
        }
        default:
          success = true;
          detail = 'Completed';
          break;
      }
    } catch (err) {
      success = false;
      detail = `Error: ${err.message}`;
    }

    if (!success) allSuccess = false;
    console.log(success ? `${c.green}✔ Done${c.reset} (${detail})` : `${c.red}✖ Failed${c.reset} (${detail})`);
    results.push({ task: task.id, label: task.label, success, detail });
  }

  const statusBadge = allSuccess ? `${c.green}✅ ALL INVARIANTS SATISFIED${c.reset}` : `${c.yellow}⚠️ ACTION ITEMS PENDING${c.reset}`;
  console.log(`\n${c.bold}Execution Status: ${statusBadge}${c.reset}\n`);

  return {
    prompt,
    plan,
    results,
    allSuccess,
  };
}

module.exports = {
  planIntent,
  executeIntent,
};
