const assert = require('assert');
const { MENU_ITEMS, renderMenu, dispatchHudAction } = require('../lib/hud');

console.log('🧪 Running Interactive Terminal HUD (TUI) Tests...');

// 1. MENU_ITEMS & renderMenu
{
  assert.strictEqual(MENU_ITEMS.length, 10);
  const menuText = renderMenu();
  assert(menuText.includes('OmniGuild Terminal HUD'));
  assert(menuText.includes('Search Memory Vault'));
  assert(menuText.includes('AST Symbol Repo-Map'));
  assert(menuText.includes('Council SOP Code Review'));
  assert(menuText.includes('Pack Codebase Context'));
  assert(menuText.includes('Deterministic Invariant Gate'));
  assert(menuText.includes('SAIF 2.0 Security Audit'));
  assert(menuText.includes('Web Visualizer Dashboard'));
  assert(menuText.includes('Council PR Blueprint'));
  assert(menuText.includes('Self-Healing Test Runner'));
  assert(menuText.includes('Exit HUD'));

  console.log('  ✔ renderMenu contains all 10 menu options and styling');
}

// 2. dispatchHudAction dispatches
(async () => {
  const cwd = process.cwd();

  // Option 1: Search Memory
  const searchOut = await dispatchHudAction('1', { cwd, query: 'auth' });
  assert(typeof searchOut === 'string');
  console.log('  ✔ Option 1 (Search Memory) verified');

  // Option 2: View AST Repo-Map
  const mapOut = await dispatchHudAction('2', { cwd, query: '' });
  assert(typeof mapOut === 'string');
  assert(mapOut.length > 0);
  console.log('  ✔ Option 2 (AST Repo-Map) verified');

  // Option 4: Pack Codebase
  const packOut = await dispatchHudAction('4', { cwd });
  assert(packOut.includes('Codebase Packed!'));
  console.log('  ✔ Option 4 (Pack Codebase) verified');

  // Option 6: Security Audit
  const auditOut = await dispatchHudAction('6', { cwd });
  assert(auditOut.includes('SAIF 2.0 Security Grade:'));
  console.log('  ✔ Option 6 (Security Audit) verified');

  // Option 8: PR Blueprint
  const prOut = await dispatchHudAction('8', { cwd });
  assert(prOut.includes('PR Blueprint Generated:'));
  console.log('  ✔ Option 8 (PR Blueprint) verified');

  // Option 9: Self-Healing Test Runner
  const healOut = await dispatchHudAction('9', { cwd });
  assert(healOut.includes('Self-Healing Test Runner:'));
  console.log('  ✔ Option 9 (Self-Healing Tests) verified');

  // Option 0: Exit
  const exitOut = await dispatchHudAction('0', { cwd });
  assert.strictEqual(exitOut, 'Exited HUD.');
  console.log('  ✔ Option 0 (Exit) verified');

  console.log('✨ All Interactive Terminal HUD Tests Passed!\n');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
