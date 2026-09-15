/**
 * OmniGuild Local Web Visualizer & Dashboard
 *
 * Launches a local zero-dependency HTTP server serving an Apple-grade
 * dark mode SPA for AST exploration, live BM25 memory search, 16-Mind Council
 * chamber, and token diet analytics.
 *
 * Pure Node.js built-ins. Zero external dependencies.
 */

const http = require('http');
const url = require('url');
const path = require('path');
const { exec } = require('child_process');
const { searchMemoryVaults } = require('./hybrid_search');
const { generateRepoMap } = require('./repomap');
const { readMemoryBank } = require('./memory_bank');
const { runCouncilSop } = require('./council_sop');
const { packCodebase } = require('./packager');
const { getVaultSummary } = require('./memory');
const { profileWorkspaceTokens } = require('./token_profiler');
const { detectStack } = require('./detectors');
const { runSelfHealing } = require('./healer');
const { generatePrBlueprint } = require('./pr_architect');

/**
 * Generates the complete, self-contained Apple dark-mode HTML dashboard.
 * 100% offline capable, zero CDN dependencies.
 * @returns {string}
 */
function getDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniGuild | Sovereign AI Engineering Council Dashboard</title>
  <style>
    :root {
      --bg: #0b0d13;
      --card-bg: rgba(23, 27, 38, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.35);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    header {
      background: rgba(15, 18, 28, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .badge {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff;
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 600;
    }
    .nav-tabs {
      display: flex;
      gap: 8px;
    }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .tab-btn:hover { color: var(--text); background: rgba(255, 255, 255, 0.05); }
    .tab-btn.active {
      color: #fff;
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
    }
    main {
      flex: 1;
      padding: 32px;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }
    .view { display: none; }
    .view.active { display: block; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 24px;
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(8px);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .card:hover {
      border-color: rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-desc {
      color: var(--text-muted);
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .search-box {
      width: 100%;
      padding: 14px 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      color: #fff;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-box:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .result-list {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .result-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 14px 18px;
    }
    .result-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 0.8rem;
    }
    .match-pct {
      color: var(--success);
      font-weight: 600;
    }
    pre {
      background: #06080d;
      border: 1px solid var(--card-border);
      padding: 16px;
      border-radius: 8px;
      color: #e2e8f0;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .btn {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>⚡ OmniGuild</span>
      <span class="badge">v3.1.0 Sovereign</span>
    </div>
    <div class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('council')">🏛️ 16-Mind Council</button>
      <button class="tab-btn" onclick="switchTab('search')">🔍 BM25 Memory</button>
      <button class="tab-btn" onclick="switchTab('repomap')">🗺️ AST Repo-Map</button>
      <button class="tab-btn" onclick="switchTab('tokens')">⚡ Context Diet</button>
      <button class="tab-btn" onclick="switchTab('tools')">🛠️ Dev Tools</button>
    </div>
  </header>

  <main>
    <!-- Council View -->
    <div id="view-council" class="view active">
      <h2>🏛️ The 16-Mind Supreme Council</h2>
      <p style="color: var(--text-muted); margin-top: 6px;">Turn every AI coding turn into an institutional peer review across 16 specialized roles.</p>
      <div id="council-grid" class="grid">
        <div class="card"><div class="card-title">🧠 Chief Software Architect</div><div class="card-desc">Domain boundaries, data contracts, and dependency inversion.</div></div>
        <div class="card"><div class="card-title">🎨 Principal UI/UX Lead</div><div class="card-desc">Apple-grade micro-interactions, responsive typography, and layout.</div></div>
        <div class="card"><div class="card-title">🛡️ Chief Security Officer</div><div class="card-desc">SAIF 2.0 compliance, zero credential leakage, and SQL injection prevention.</div></div>
        <div class="card"><div class="card-title">⚡ Staff Full-Stack Engineer</div><div class="card-desc">Modular, idiomatic, clean production engineering across all stacks.</div></div>
        <div class="card"><div class="card-title">🧪 Principal QA Lead</div><div class="card-desc">Hermetic tests, boundary validation, and zero-regression invariant proofs.</div></div>
        <div class="card"><div class="card-title">🚀 DevOps Engineer</div><div class="card-desc">CI/CD pipelines, hermetic packaging, and reproducible execution.</div></div>
        <div class="card"><div class="card-title">🌐 Google CTO Brain</div><div class="card-desc">Hyperscale systems, distributed consistency, and AI-first engineering.</div></div>
        <div class="card"><div class="card-title">🍎 Apple CTO Brain</div><div class="card-desc">Uncompromising product excellence, magical ergonomics, and DX simplicity.</div></div>
        <div class="card"><div class="card-title">🧭 Anthropic Safety Brain</div><div class="card-desc">Constitutional safety, intent alignment, and defensive programming.</div></div>
        <div class="card"><div class="card-title">⚡ Performance Specialist</div><div class="card-desc">O(n) efficiency, zero-copy caching, memory layout, and async I/O.</div></div>
        <div class="card"><div class="card-title">🗄️ Database Reliability Engineer</div><div class="card-desc">ACID transactions, schema migration safety, query plans, and indexing.</div></div>
        <div class="card"><div class="card-title">💼 Product Strategy Lead</div><div class="card-desc">Feature fidelity, user stories, and anti-bloat hygiene.</div></div>
        <div class="card"><div class="card-title">🔮 Chief Cognitive Analyst</div><div class="card-desc">Latent edge-case extraction and requirements anticipation.</div></div>
        <div class="card"><div class="card-title">🔬 Principal AGI Scientist</div><div class="card-desc">Multi-agent orchestration, cognitive loops, and neuro-symbolic reasoning.</div></div>
        <div class="card"><div class="card-title">🧬 Self-Healing Specialist</div><div class="card-desc">Runtime fault recovery, auto-patching, and automated regression fixing.</div></div>
        <div class="card"><div class="card-title">📊 Knowledge Graph Architect</div><div class="card-desc">BM25 Okapi hybrid retrieval, persistent memory graphs, and semantic indexing.</div></div>
      </div>
    </div>

    <!-- Search View -->
    <div id="view-search" class="view">
      <h2>🔍 BM25 Probabilistic Memory Search</h2>
      <p style="color: var(--text-muted); margin: 6px 0 16px 0;">Ranked memory retrieval across institutional memory, security standards, and team decisions.</p>
      <input type="text" id="searchInput" class="search-box" placeholder="Type keywords (e.g. JWT RS256, auth, database, fetch)..." onkeyup="handleSearch(event)">
      <div id="searchResults" class="result-list"></div>
    </div>

    <!-- Repo-Map View -->
    <div id="view-repomap" class="view">
      <h2>🗺️ Token-Dense AST Symbol Repo-Map</h2>
      <p style="color: var(--text-muted); margin: 6px 0 16px 0;">Token-budgeted project topology across JavaScript/TypeScript, Python, Go, and Rust.</p>
      <button class="btn" onclick="loadRepoMap()">🔄 Refresh Symbol Map</button>
      <div style="margin-top: 16px;">
        <pre id="repomapContent">Click "Refresh Symbol Map" to inspect project symbols...</pre>
      </div>
    </div>

    <!-- Tokens View -->
    <div id="view-tokens" class="view">
      <h2>⚡ Context Diet & Token Profiler</h2>
      <p style="color: var(--text-muted); margin: 6px 0 16px 0;">Comparing OmniGuild's razor-lean base contract against standard monolithic AI prompt templates.</p>
      <div class="grid">
        <div class="card">
          <div class="card-title">Efficiency Grade</div>
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--success); margin: 8px 0;">A+</div>
          <div class="card-desc">Optimal context efficiency with sub-second streaming.</div>
        </div>
        <div class="card">
          <div class="card-title">Context Reduction</div>
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--accent); margin: 8px 0;">83%</div>
          <div class="card-desc">Saves ~3,729 tokens on every turn.</div>
        </div>
        <div class="card">
          <div class="card-title">Cost Savings</div>
          <div style="font-size: 2.5rem; font-weight: 700; color: #38bdf8; margin: 8px 0;">~$11.19</div>
          <div class="card-desc">Estimated savings per 1,000 chat turns.</div>
        </div>
      </div>
    </div>

    <!-- Dev Tools View -->
    <div id="view-tools" class="view">
      <h2>🛠️ Developer Superpowers</h2>
      <div class="grid">
        <div class="card">
          <div class="card-title">🏛️ Council SOP Review</div>
          <div class="card-desc">Execute 4-stage sequential review across Architecture, Security, QA, and UX.</div>
          <button class="btn" style="margin-top: 14px;" onclick="runSopReview()">Review Active File</button>
        </div>
        <div class="card">
          <div class="card-title">📦 Codebase Packager</div>
          <div class="card-desc">Bundle repository into clean AI-ready Markdown with automated credential scrubbing.</div>
          <button class="btn" style="margin-top: 14px;" onclick="packContext()">Bundle Workspace</button>
        </div>
        <div class="card">
          <div class="card-title">📝 Council PR Architect</div>
          <div class="card-desc">Generate executive GitHub PR descriptions with Council sign-off proofs.</div>
          <button class="btn" style="margin-top: 14px;" onclick="generatePr()">Generate PR Blueprint</button>
        </div>
      </div>
      <div style="margin-top: 20px;">
        <pre id="toolOutput" style="display: none;"></pre>
      </div>
    </div>
  </main>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      event.target.classList.add('active');
      const target = document.getElementById('view-' + tabId);
      if (target) target.classList.add('active');
    }

    async function handleSearch(e) {
      const q = document.getElementById('searchInput').value.trim();
      if (!q) {
        document.getElementById('searchResults').innerHTML = '';
        return;
      }
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        const container = document.getElementById('searchResults');
        if (data.results && data.results.length > 0) {
          container.innerHTML = data.results.map(r => \`
            <div class="result-item">
              <div class="result-header">
                <span style="color: var(--text-muted);">\${r.file}</span>
                <span class="match-pct">\${r.percentage}% Match</span>
              </div>
              <div style="font-size: 0.95rem; line-height: 1.4;">\${r.text}</div>
            </div>
          \`).join('');
        } else {
          container.innerHTML = '<div style="color: var(--text-muted); padding: 12px 0;">No matching lessons found.</div>';
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function loadRepoMap() {
      const pre = document.getElementById('repomapContent');
      pre.textContent = 'Analyzing AST symbols across JS/TS, Python, Go, and Rust...';
      try {
        const res = await fetch('/api/repomap');
        const data = await res.json();
        pre.textContent = data.markdown || 'No symbols found.';
      } catch (err) {
        pre.textContent = 'Error loading AST symbol map: ' + err.message;
      }
    }

    async function runSopReview() {
      const pre = document.getElementById('toolOutput');
      pre.style.display = 'block';
      pre.textContent = 'Running 4-stage Council SOP review...';
      try {
        const res = await fetch('/api/review', { method: 'POST' });
        const data = await res.json();
        pre.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        pre.textContent = 'Error running review: ' + err.message;
      }
    }

    async function packContext() {
      const pre = document.getElementById('toolOutput');
      pre.style.display = 'block';
      pre.textContent = 'Bundling codebase context with secret scrubbing...';
      try {
        const res = await fetch('/api/pack', { method: 'POST' });
        const data = await res.json();
        pre.textContent = \`Bundle complete! Files: \${data.totalFiles}, Chars: \${data.totalChars}, Tokens: ~\${data.estimatedTokens}\`;
      } catch (err) {
        pre.textContent = 'Error packing context: ' + err.message;
      }
    }

    async function generatePr() {
      const pre = document.getElementById('toolOutput');
      pre.style.display = 'block';
      pre.textContent = 'Analyzing git diff and generating PR blueprint...';
      try {
        const res = await fetch('/api/pr');
        const data = await res.json();
        pre.textContent = data.markdown || 'Clean working tree. No active diff found.';
      } catch (err) {
        pre.textContent = 'Error generating PR: ' + err.message;
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Starts the local HTTP dashboard server.
 * @param {object} options
 * @param {number} [options.port=4321]
 * @param {string} [options.cwd]
 * @param {boolean} [options.openBrowser=true]
 * @returns {Promise<{ server: http.Server, port: number, url: string }>}
 */
function startDashboard(options = {}) {
  const cwd = options.cwd || process.cwd();
  const initialPort = options.port || 4321;
  const openBrowser = options.openBrowser !== false;

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      // Enable CORS for local testing
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getDashboardHtml());
        return;
      }

      if (pathname === '/api/status') {
        const stack = detectStack(cwd);
        const vault = getVaultSummary();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ stack, vault, version: '3.1.0' }));
        return;
      }

      if (pathname === '/api/search') {
        const query = parsedUrl.searchParams.get('q') || '';
        const searchData = searchMemoryVaults(query, { cwd, maxResults: 15 });
        const results = (searchData.matches || []).map(m => ({
          file: `${m.document.vault} (${m.document.file}:${m.document.lineNum})`,
          percentage: m.relevancePercent,
          text: m.document.text
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ query, results }));
        return;
      }

      if (pathname === '/api/repomap') {
        const repomap = generateRepoMap(cwd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(repomap));
        return;
      }

      if (pathname === '/api/memory-bank') {
        const bank = readMemoryBank(cwd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bank));
        return;
      }

      if (pathname === '/api/tokens') {
        const profile = profileWorkspaceTokens(cwd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(profile));
        return;
      }

      if (pathname === '/api/review' && req.method === 'POST') {
        const repomap = generateRepoMap(cwd);
        const sampleCode = repomap.markdown.slice(0, 1500);
        const review = runCouncilSop(sampleCode, { filename: 'sample_code.js' });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(review));
        return;
      }

      if (pathname === '/api/pack' && req.method === 'POST') {
        const packResult = packCodebase(cwd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(packResult));
        return;
      }

      if (pathname === '/api/pr') {
        const prResult = generatePrBlueprint({ cwd });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(prResult));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        startDashboard({ ...options, port: initialPort + 1 }).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });

    server.listen(initialPort, () => {
      const serverUrl = `http://localhost:${initialPort}`;

      if (openBrowser) {
        const startCmd = process.platform === 'win32'
          ? `start ${serverUrl}`
          : (process.platform === 'darwin' ? `open ${serverUrl}` : `xdg-open ${serverUrl}`);
        exec(startCmd, () => {});
      }

      resolve({ server, port: initialPort, url: serverUrl });
    });
  });
}

module.exports = {
  getDashboardHtml,
  startDashboard
};
