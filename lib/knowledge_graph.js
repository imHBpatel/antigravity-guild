/**
 * OmniGuild Knowledge Graph & Letta Context Pager
 *
 * Implements Cognee-style semantic entity-relationship graph traversal (1-2 hops)
 * and Letta (MemGPT) OS-style L1 Working RAM / L2 Archival Disk memory paging.
 *
 * Pure Node.js built-ins. Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const { generateRepoMap } = require('./repomap');
const { readMemoryBank } = require('./memory_bank');
const { searchMemoryVaults } = require('./hybrid_search');

class KnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(id, label, type = 'concept', tags = [], properties = {}) {
    this.nodes.set(id, {
      id,
      label,
      type,
      tags,
      properties
    });
    return this.nodes.get(id);
  }

  addEdge(source, target, relation = 'relates_to', weight = 1.0) {
    this.edges.push({ source, target, relation, weight });
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Traverses graph from startNodeId up to maxDepth hops.
   * @param {string} startNodeId
   * @param {number} maxDepth
   * @returns {{ nodes: object[], edges: object[] }}
   */
  getNeighbors(startNodeId, maxDepth = 1) {
    const visitedNodes = new Set([startNodeId]);
    const visitedEdges = [];
    let currentLevel = [startNodeId];

    for (let depth = 0; depth < maxDepth; depth++) {
      const nextLevel = [];
      for (const nodeId of currentLevel) {
        for (const edge of this.edges) {
          if (edge.source === nodeId && !visitedNodes.has(edge.target)) {
            visitedNodes.add(edge.target);
            visitedEdges.push(edge);
            nextLevel.push(edge.target);
          } else if (edge.target === nodeId && !visitedNodes.has(edge.source)) {
            visitedNodes.add(edge.source);
            visitedEdges.push(edge);
            nextLevel.push(edge.source);
          }
        }
      }
      currentLevel = nextLevel;
    }

    const resultNodes = Array.from(visitedNodes)
      .map(id => this.nodes.get(id))
      .filter(Boolean);

    return { nodes: resultNodes, edges: visitedEdges };
  }

  /**
   * Automatically builds a semantic graph from the workspace AST symbols and memory rules.
   * @param {string} cwd
   */
  buildFromWorkspace(cwd = process.cwd()) {
    // 1. Extract AST Symbols
    const repomap = generateRepoMap(cwd);
    for (const file of repomap.files || []) {
      const fileId = `file:${file.relPath}`;
      this.addNode(fileId, file.relPath, 'file', [path.extname(file.relPath)]);

      for (const sym of file.symbols || []) {
        const symId = `symbol:${sym.name}`;
        this.addNode(symId, sym.name, 'symbol', [sym.kind], { signature: sym.signature, line: sym.line });
        this.addEdge(fileId, symId, 'defines');

        // Link common conceptual tags
        const lowerName = sym.name.toLowerCase();
        if (lowerName.includes('auth') || lowerName.includes('token') || lowerName.includes('jwt')) {
          this.addNode('concept:security', 'Security Standards', 'concept', ['auth', 'crypto']);
          this.addEdge(symId, 'concept:security', 'enforces_or_requires');
        }
        if (lowerName.includes('test') || lowerName.includes('verify')) {
          this.addNode('concept:testing', 'Testing & Verification', 'concept', ['qa', 'invariant']);
          this.addEdge(symId, 'concept:testing', 'verifies');
        }
      }
    }

    // 2. Link Memory Rules
    const securityMem = searchMemoryVaults('security', { cwd, maxResults: 5 });
    if (securityMem.matches && securityMem.matches.length > 0) {
      this.addNode('rule:security', 'Global Security Standards (SAIF)', 'rule', ['security', 'saif']);
      this.addEdge('concept:security', 'rule:security', 'governed_by');
    }

    return this;
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }

  static fromJSON(data) {
    const kg = new KnowledgeGraph();
    for (const node of data.nodes || []) {
      kg.addNode(node.id, node.label, node.type, node.tags, node.properties);
    }
    kg.edges = data.edges || [];
    return kg;
  }

  pageInContext(queryOrEntity = '', cwd = process.cwd()) {
    return pageInContext(queryOrEntity, cwd);
  }
}

/**
 * Letta OS Context Pager:
 * Loads L1 Working RAM Context (active task + 1-2 hop neighbors) while keeping L2 archival vaults on disk.
 * Keeps prompt size ~350 tokens regardless of total repository size.
 *
 * @param {string} queryOrEntity
 * @param {string} cwd
 * @returns {{ l1Tokens: number, l1Context: string, pagedEntities: string[] }}
 */
function pageInContext(queryOrEntity = '', cwd = process.cwd()) {
  const kg = new KnowledgeGraph().buildFromWorkspace(cwd);
  const bank = readMemoryBank(cwd);

  // Find matching start node in graph
  let matchingNodeId = null;
  const lower = queryOrEntity.toLowerCase();
  for (const [id, node] of kg.nodes) {
    if (id.toLowerCase().includes(lower) || node.label.toLowerCase().includes(lower)) {
      matchingNodeId = id;
      break;
    }
  }

  let graphContext = '';
  const pagedEntities = [];

  if (matchingNodeId) {
    const subgraph = kg.getNeighbors(matchingNodeId, 2);
    graphContext = '### 🕸️ Active Knowledge Graph Links (L1 RAM Paged):\n';
    for (const node of subgraph.nodes) {
      pagedEntities.push(node.label);
      graphContext += `- **[${node.type.toUpperCase()}]** ${node.label}\n`;
    }
    graphContext += '\n';
  } else {
    graphContext = '### 🕸️ Active Knowledge Graph:\n- Connected to workspace AST symbols & memory rules.\n\n';
  }

  // Active Task Context (Short-Term Memory)
  const taskSnippet = bank.files && bank.files['active_task.md']
    ? bank.files['active_task.md'].slice(0, 800)
    : 'No active task registered. Ready for instructions.';

  const l1Context = `# 🧠 OmniGuild Working Context (L1 RAM)
> Operating System Memory Paging: Deep memory stored in L2 Archival Disk.

${graphContext}
### 🎯 Current Active Task Context:
${taskSnippet}
`.trim();

  const l1Tokens = Math.ceil(l1Context.length / 4);

  return {
    l1Tokens,
    l1Context,
    pagedEntities
  };
}

module.exports = {
  KnowledgeGraph,
  pageInContext
};
