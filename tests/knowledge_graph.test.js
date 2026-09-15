const assert = require('assert');
const { KnowledgeGraph, pageInContext } = require('../lib/knowledge_graph');

console.log('🧪 Running Knowledge Graph & Letta Context Pager Tests...');

// 1. KnowledgeGraph creation & traversal
{
  const kg = new KnowledgeGraph();
  kg.addNode('auth', 'Auth Module', 'symbol');
  kg.addNode('jwt', 'RS256 JWT Verification', 'rule');
  kg.addNode('key_rotation', 'Key Rotation Invariant', 'rule');

  kg.addEdge('auth', 'jwt', 'enforces');
  kg.addEdge('jwt', 'key_rotation', 'depends_on');

  // 1-hop
  const hop1 = kg.getNeighbors('auth', 1);
  assert.strictEqual(hop1.nodes.length, 2); // auth + jwt

  // 2-hops
  const hop2 = kg.getNeighbors('auth', 2);
  assert.strictEqual(hop2.nodes.length, 3); // auth + jwt + key_rotation

  console.log('  ✔ Graph node addition and multi-hop neighbor traversal verified');
}

// 2. buildFromWorkspace test
{
  const kg = new KnowledgeGraph().buildFromWorkspace(process.cwd());
  assert(kg.nodes.size > 0, 'Must extract nodes from current repository');
  assert(kg.edges.length > 0, 'Must link symbols and files');

  console.log('  ✔ buildFromWorkspace automatically indexes symbols and concepts');
}

// 3. pageInContext test
{
  const paged = pageInContext('security', process.cwd());
  assert(typeof paged.l1Tokens === 'number');
  assert(paged.l1Tokens < 1500, 'L1 Working RAM context must remain compact');
  assert(paged.l1Context.includes('OmniGuild Working Context (L1 RAM)'));

  console.log('  ✔ pageInContext outputs compact L1 RAM context with L2 archival paging');
}

console.log('✨ All Knowledge Graph & Context Pager Tests Passed!\n');
