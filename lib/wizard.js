'use strict';

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { c, VERSION, PRESETS, getBanner } = require('./constants');
const { detectStack } = require('./detectors');
const { initMemoryHub } = require('./memory');
const { synthesizeContracts } = require('./generator');
const { enforceGitignore } = require('./gitignore');

/**
 * Prompt question helper using native readline.
 */
function askQuestion(rl, query, defaultValue = '') {
  return new Promise((resolve) => {
    const promptText = defaultValue
      ? `${c.bold}${query}${c.reset} ${c.dim}(default: ${defaultValue})${c.reset}: `
      : `${c.bold}${query}${c.reset}: `;

    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Run the interactive configuration wizard.
 */
async function runInteractiveWizard() {
  console.log(getBanner());
  console.log(`${c.yellow}${c.bold}🧙 OPENGUILD INTERACTIVE SETUP WIZARD (v${VERSION})${c.reset}\n`);

  const cwd = process.cwd();
  const projectName = path.basename(cwd);
  const memHub = initMemoryHub(false);

  let files = [];
  try {
    files = fs.readdirSync(cwd);
  } catch {
    files = [];
  }
  const autoStack = detectStack(files, cwd);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(`${c.magenta}🔍 Auto-Detected Stack:${c.reset} ${c.bold}${autoStack.lang} (${autoStack.framework})${c.reset}\n`);

    // 0. Preset Selection
    console.log(`${c.bold}Available Domain Presets:${c.reset}`);
    for (const [key, p] of Object.entries(PRESETS)) {
      console.log(`  • ${c.bold}${key.padEnd(9)}${c.reset} — ${p.name} (${p.roles.length} experts)`);
    }
    const chosenPreset = await askQuestion(rl, '\nSelect domain preset (full, backend, web, mobile, ai-ml)', 'full');
    const validPreset = PRESETS[chosenPreset] ? chosenPreset : 'full';

    // 1. Invariant Customization
    const customTest = await askQuestion(rl, 'Test verification command', autoStack.testCmd);
    const customLint = await askQuestion(rl, 'Linter command', autoStack.lintCmd);
    const customTypecheck = await askQuestion(rl, 'Typechecker command', autoStack.typecheckCmd);

    // 2. Initial Developer Lesson / Preference
    const initialLesson = await askQuestion(
      rl,
      'Add a global rule or preference to remember across all projects',
      'Always write clean modular code with deterministic automated tests.'
    );

    rl.close();

    const finalStack = {
      ...autoStack,
      testCmd: customTest,
      lintCmd: customLint,
      typecheckCmd: customTypecheck,
    };

    // Save initial lesson to global memory if provided
    if (initialLesson && initialLesson.trim()) {
      const instMemPath = path.join(memHub.path, 'institutional_memory.md');
      if (fs.existsSync(instMemPath)) {
        fs.appendFileSync(instMemPath, `\n- [${new Date().toISOString().substring(0, 10)}] ${initialLesson.trim()}\n`, 'utf8');
        console.log(`\n${c.green}🧠 [Saved]${c.reset} Added custom lesson to global memory.`);
      }
    }

    // Synthesize contracts
    const contracts = synthesizeContracts(cwd, projectName, memHub.path, finalStack, validPreset, false);
    console.log(`${c.green}✅ [Synthesized]${c.reset}`);
    for (const item of contracts) {
      console.log(`  • ${item.label}`);
    }

    // Context hygiene
    enforceGitignore(cwd, false);

    console.log(`\n${c.green}${c.bold}🎉 [Success]${c.reset} Custom OpenGuild configuration active for "${c.bold}${projectName}${c.reset}" (${PRESETS[validPreset].name})!\n`);
  } catch (err) {
    rl.close();
    console.error(`\n${c.red}✖ Wizard aborted: ${err.message}${c.reset}`);
  }
}

module.exports = {
  runInteractiveWizard,
};
