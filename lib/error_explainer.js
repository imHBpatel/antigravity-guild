/**
 * Superpower 28: Stack Trace Decoder & Error Explainer
 * 
 * Inspired by Warp terminal AI, Sentry error explanations.
 * Parses raw stack traces and error output, maps them to source files,
 * classifies error types, and generates natural-language explanations
 * with fix suggestions — all offline, zero-cloud.
 * 
 * Zero external dependencies — pure Node.js built-ins only.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Error Classification Database ──────────────────────────────────────
const ERROR_CLASSIFICATIONS = {
  // Node.js / JavaScript errors
  TypeError: {
    category: 'TYPE_ERROR',
    description: 'A value is not of the expected type',
    commonCauses: [
      'Calling a method on `undefined` or `null`',
      'Accessing a property on a non-object value',
      'Passing wrong argument types to a function',
    ],
    fixStrategies: [
      'Add null/undefined checks before accessing properties',
      'Use optional chaining (`?.`) for potentially null values',
      'Validate function arguments at entry points',
    ],
  },
  ReferenceError: {
    category: 'REFERENCE_ERROR',
    description: 'A variable or function is referenced before being defined',
    commonCauses: [
      'Typo in variable or function name',
      'Using a variable before declaration (temporal dead zone)',
      'Missing import/require statement',
    ],
    fixStrategies: [
      'Check spelling of the referenced identifier',
      'Ensure the variable is declared before use',
      'Add the missing import/require for the module',
    ],
  },
  SyntaxError: {
    category: 'SYNTAX_ERROR',
    description: 'The code contains invalid syntax that the parser cannot understand',
    commonCauses: [
      'Missing or mismatched brackets, braces, or parentheses',
      'Unexpected token (e.g., using ES module syntax in CommonJS)',
      'Invalid JSON format in configuration files',
    ],
    fixStrategies: [
      'Check for missing closing brackets or braces',
      'Verify the file uses the correct module format (ESM vs CJS)',
      'Use a JSON validator for config files',
    ],
  },
  RangeError: {
    category: 'RANGE_ERROR',
    description: 'A numeric value is outside its valid range',
    commonCauses: [
      'Infinite recursion causing stack overflow',
      'Invalid array length (negative or too large)',
      'Number conversion with invalid radix',
    ],
    fixStrategies: [
      'Add recursion depth limits or base case checks',
      'Validate array sizes before allocation',
      'Check numeric inputs for valid ranges',
    ],
  },
  // System / Node.js errors
  ENOENT: {
    category: 'FILE_NOT_FOUND',
    description: 'A file or directory does not exist at the expected path',
    commonCauses: [
      'Wrong file path or the file was moved/deleted',
      'Missing configuration file that the app expects',
      'Current working directory is different from expected',
    ],
    fixStrategies: [
      'Verify the file path is correct (check case sensitivity)',
      'Create the missing file or configuration',
      'Use `path.resolve()` or `__dirname` for reliable paths',
    ],
  },
  ECONNREFUSED: {
    category: 'CONNECTION_ERROR',
    description: 'Connection to a server was refused — the service is not running or unreachable',
    commonCauses: [
      'The target server/database is not started',
      'Wrong host or port in the connection config',
      'Firewall blocking the connection',
    ],
    fixStrategies: [
      'Start the required service (database, API server, etc.)',
      'Check host and port configuration',
      'Verify network/firewall rules allow the connection',
    ],
  },
  EADDRINUSE: {
    category: 'PORT_IN_USE',
    description: 'The network port is already being used by another process',
    commonCauses: [
      'Another instance of the server is already running',
      'A different application is using the same port',
      'Previous process did not shut down cleanly',
    ],
    fixStrategies: [
      'Kill the process using the port: `lsof -i :PORT` or `netstat -ano`',
      'Use a different port via environment variable',
      'Ensure graceful shutdown in your application',
    ],
  },
  EACCES: {
    category: 'PERMISSION_ERROR',
    description: 'Permission denied — insufficient access rights for the operation',
    commonCauses: [
      'Trying to write to a read-only file or directory',
      'Binding to a privileged port (below 1024) without root',
      'File owned by a different user',
    ],
    fixStrategies: [
      'Check file permissions with `ls -la` or `icacls`',
      'Use a non-privileged port (>1024)',
      'Run with appropriate permissions (avoid running as root in production)',
    ],
  },
  ENOMEM: {
    category: 'MEMORY_ERROR',
    description: 'System ran out of memory',
    commonCauses: [
      'Processing very large files or datasets in memory',
      'Memory leak from event listeners or closures',
      'Node.js heap limit reached',
    ],
    fixStrategies: [
      'Use streaming instead of loading entire files',
      'Increase Node.js heap with `--max-old-space-size`',
      'Profile memory usage to find leaks',
    ],
  },
  MODULE_NOT_FOUND: {
    category: 'MISSING_MODULE',
    description: 'A required module/package cannot be found',
    commonCauses: [
      'Package not installed — missing `npm install`',
      'Wrong module name or path in require/import',
      'Peer dependency not satisfied',
    ],
    fixStrategies: [
      'Run `npm install` to install dependencies',
      'Check the module name for typos',
      'Install the specific missing package',
    ],
  },
};

// ── Stack Trace Parsing ────────────────────────────────────────────────
/**
 * Parse a raw error output string into structured error information.
 */
function parseError(errorText) {
  const lines = errorText.split('\n').map(l => l.trim()).filter(Boolean);
  
  const result = {
    errorType: null,
    errorMessage: null,
    errorCode: null,
    stackFrames: [],
    sourceFile: null,
    sourceLine: null,
    rawText: errorText,
  };

  for (const line of lines) {
    // Node.js error pattern: ErrorType: message
    const errorMatch = line.match(/^(\w+Error|Error):\s*(.+)/);
    if (errorMatch && !result.errorType) {
      result.errorType = errorMatch[1];
      result.errorMessage = errorMatch[2];
    }

    // System error code: { code: 'ENOENT', ... } or error.code = 'ENOENT'
    const codeMatch = line.match(/code:\s*'(\w+)'/) || line.match(/errno:\s*(-?\d+)/);
    if (codeMatch) {
      result.errorCode = codeMatch[1];
    }

    // Module not found
    if (line.includes('Cannot find module') || line.includes('MODULE_NOT_FOUND')) {
      result.errorType = result.errorType || 'Error';
      result.errorCode = 'MODULE_NOT_FOUND';
      const moduleMatch = line.match(/Cannot find module\s+'([^']+)'/);
      if (moduleMatch) {
        result.errorMessage = `Cannot find module '${moduleMatch[1]}'`;
      }
    }

    // Stack frame: at FunctionName (file:line:col)
    const frameMatch = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?$/);
    if (frameMatch) {
      result.stackFrames.push({
        function: frameMatch[1] || '<anonymous>',
        file: frameMatch[2],
        line: parseInt(frameMatch[3], 10),
        column: parseInt(frameMatch[4], 10),
      });
    }

    // Python traceback: File "path", line N, in function
    const pyFrameMatch = line.match(/File\s+"(.+?)",\s*line\s+(\d+),\s*in\s+(.+)/);
    if (pyFrameMatch) {
      result.stackFrames.push({
        function: pyFrameMatch[3],
        file: pyFrameMatch[1],
        line: parseInt(pyFrameMatch[2], 10),
        column: 0,
      });
    }

    // Python error line
    const pyErrorMatch = line.match(/^(\w+Error|Exception):\s*(.+)/);
    if (pyErrorMatch && !result.errorType) {
      result.errorType = pyErrorMatch[1];
      result.errorMessage = pyErrorMatch[2];
    }

    // Go panic
    if (line.startsWith('panic:')) {
      result.errorType = 'GoPanic';
      result.errorMessage = line.replace('panic:', '').trim();
    }

    // Go stack frame: /path/to/file.go:123
    const goFrameMatch = line.match(/^\t(.+\.go):(\d+)/);
    if (goFrameMatch) {
      result.stackFrames.push({
        function: '<go>',
        file: goFrameMatch[1],
        line: parseInt(goFrameMatch[2], 10),
        column: 0,
      });
    }

    // Rust panic
    if (line.includes("thread '") && line.includes('panicked at')) {
      result.errorType = 'RustPanic';
      const rustMsgMatch = line.match(/panicked at\s+'(.+?)'/);
      if (rustMsgMatch) result.errorMessage = rustMsgMatch[1];
    }
  }

  // Set source file from first user-code stack frame
  const userFrame = result.stackFrames.find(f =>
    !f.file.includes('node_modules') &&
    !f.file.includes('internal/') &&
    !f.file.startsWith('node:')
  );
  if (userFrame) {
    result.sourceFile = userFrame.file;
    result.sourceLine = userFrame.line;
  }

  return result;
}

// ── Source Context Extraction ──────────────────────────────────────────
/**
 * Extract source code context around the error line.
 */
function extractSourceContext(filePath, errorLine, contextRadius = 5) {
  try {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    if (!fs.existsSync(resolved)) return null;

    const content = fs.readFileSync(resolved, 'utf8');
    const lines = content.split('\n');
    
    const start = Math.max(0, errorLine - contextRadius - 1);
    const end = Math.min(lines.length, errorLine + contextRadius);

    const contextLines = [];
    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const marker = lineNum === errorLine ? '>>>' : '   ';
      contextLines.push(`${marker} ${String(lineNum).padStart(4)} | ${lines[i]}`);
    }

    return {
      lines: contextLines,
      errorLineContent: lines[errorLine - 1] || '',
      fileName: path.basename(resolved),
    };
  } catch (_) {
    return null;
  }
}

// ── Explanation Generation ─────────────────────────────────────────────
/**
 * Generate a natural-language explanation of the error.
 */
function generateExplanation(parsedError, sourceContext) {
  const errorKey = parsedError.errorCode || parsedError.errorType;
  const classification = ERROR_CLASSIFICATIONS[errorKey] ||
    ERROR_CLASSIFICATIONS[parsedError.errorType] || null;

  const sections = [];

  // Header
  sections.push(`# 🔍 Error Explanation: ${parsedError.errorType || 'Unknown Error'}`);
  sections.push('');

  // What happened
  sections.push('## 💥 What Happened');
  if (classification) {
    sections.push(`**${classification.description}.**`);
  }
  sections.push('');
  sections.push(`> \`${parsedError.errorType}: ${parsedError.errorMessage}\``);
  if (parsedError.errorCode) {
    sections.push(`> Error Code: \`${parsedError.errorCode}\``);
  }
  sections.push('');

  // Where it happened
  if (parsedError.sourceFile) {
    sections.push('## 📍 Where It Happened');
    sections.push(`- **File:** \`${parsedError.sourceFile}\``);
    sections.push(`- **Line:** ${parsedError.sourceLine}`);
    sections.push('');

    if (sourceContext) {
      sections.push('### Source Context');
      sections.push('```');
      sections.push(sourceContext.lines.join('\n'));
      sections.push('```');
      sections.push('');
    }
  }

  // Stack trace (user frames only)
  const userFrames = parsedError.stackFrames.filter(f =>
    !f.file.includes('node_modules') &&
    !f.file.includes('internal/') &&
    !f.file.startsWith('node:')
  );
  if (userFrames.length > 0) {
    sections.push('## 🔗 Call Stack (Your Code)');
    for (const frame of userFrames.slice(0, 8)) {
      sections.push(`1. \`${frame.function}\` at \`${path.basename(frame.file)}:${frame.line}\``);
    }
    sections.push('');
  }

  // Why it happened
  if (classification) {
    sections.push('## 🤔 Why This Likely Happened');
    for (const cause of classification.commonCauses) {
      sections.push(`- ${cause}`);
    }
    sections.push('');

    // How to fix
    sections.push('## 🛠️ How to Fix It');
    for (let i = 0; i < classification.fixStrategies.length; i++) {
      sections.push(`${i + 1}. ${classification.fixStrategies[i]}`);
    }
    sections.push('');
  }

  // Quick fix pattern based on specific error messages
  const quickFix = generateQuickFix(parsedError);
  if (quickFix) {
    sections.push('## ⚡ Quick Fix Suggestion');
    sections.push('```javascript');
    sections.push(quickFix);
    sections.push('```');
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Generate a code snippet quick fix based on the error pattern.
 */
function generateQuickFix(parsedError) {
  const msg = (parsedError.errorMessage || '').toLowerCase();

  // "Cannot read properties of undefined (reading 'X')"
  const readPropMatch = msg.match(/cannot read propert(?:y|ies) of (?:undefined|null)(?: \(reading '(\w+)'\))?/);
  if (readPropMatch) {
    const prop = readPropMatch[1] || 'property';
    return `// Before (crashes):\n// const value = obj.${prop};\n\n// After (safe):\nconst value = obj?.${prop}; // Optional chaining\n// OR\nconst value = obj && obj.${prop}; // Guard check`;
  }

  // "X is not a function"
  if (msg.includes('is not a function')) {
    const funcMatch = msg.match(/(\w+) is not a function/);
    const funcName = funcMatch ? funcMatch[1] : 'fn';
    return `// Check if the value is actually a function before calling:\nif (typeof ${funcName} === 'function') {\n  ${funcName}();\n} else {\n  console.error('${funcName} is not a function:', typeof ${funcName});\n}`;
  }

  // "Cannot find module 'X'"
  const moduleMatch = msg.match(/cannot find module '(.+?)'/);
  if (moduleMatch) {
    const mod = moduleMatch[1];
    if (mod.startsWith('.') || mod.startsWith('/')) {
      return `// The relative module path may be wrong.\n// Verify the file exists at: ${mod}\n// Common fixes:\n// 1. Check if the file extension is needed (.js, .json)\n// 2. Verify the relative path from the current file`;
    }
    return `// Install the missing package:\n// npm install ${mod}\n// OR\n// yarn add ${mod}`;
  }

  return null;
}

// ── Memory Cross-Reference ─────────────────────────────────────────────
/**
 * Search the memory vault for known error patterns and past fixes.
 */
function crossReferenceMemory(parsedError, projectRoot) {
  const memoryPaths = [
    path.join(projectRoot, '.openguild', 'team_memory.md'),
    path.join(require('os').homedir(), '.openguild', 'memory', 'institutional_memory.md'),
  ];

  const matches = [];
  const searchTerms = [
    parsedError.errorType,
    parsedError.errorCode,
    ...(parsedError.errorMessage || '').split(/\s+/).filter(w => w.length > 4),
  ].filter(Boolean);

  for (const memPath of memoryPaths) {
    try {
      if (!fs.existsSync(memPath)) continue;
      const content = fs.readFileSync(memPath, 'utf8');
      const memLines = content.split('\n');

      for (const memLine of memLines) {
        const lineText = memLine.toLowerCase();
        const matchCount = searchTerms.filter(t => lineText.includes(t.toLowerCase())).length;
        if (matchCount >= 2) {
          matches.push({
            text: memLine.replace(/^[-*•]\s*/, '').trim(),
            source: path.basename(memPath),
            relevance: matchCount,
          });
        }
      }
    } catch (_) { /* skip */ }
  }

  return matches.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

// ── Main Entry Point ───────────────────────────────────────────────────
/**
 * Explain an error from raw text output.
 * @param {string} errorText — raw error/stack trace text
 * @param {string} projectRoot — project directory for source context
 * @returns {{ explanation: string, parsed: Object, memoryHits: Array }}
 */
function explainError(errorText, projectRoot = process.cwd()) {
  const parsed = parseError(errorText);

  // Get source context if we identified the file
  let sourceContext = null;
  if (parsed.sourceFile && parsed.sourceLine) {
    sourceContext = extractSourceContext(
      path.isAbsolute(parsed.sourceFile)
        ? parsed.sourceFile
        : path.join(projectRoot, parsed.sourceFile),
      parsed.sourceLine
    );
  }

  // Generate explanation
  const explanation = generateExplanation(parsed, sourceContext);

  // Cross-reference with memory
  const memoryHits = crossReferenceMemory(parsed, projectRoot);

  // Append memory hits to explanation if found
  let fullExplanation = explanation;
  if (memoryHits.length > 0) {
    fullExplanation += '## 🧠 Related Lessons from Memory Vault\n';
    for (const hit of memoryHits) {
      fullExplanation += `- _(${hit.source})_ ${hit.text}\n`;
    }
    fullExplanation += '\n';
  }

  return {
    explanation: fullExplanation,
    parsed,
    memoryHits,
  };
}

module.exports = {
  explainError,
  parseError,
  extractSourceContext,
  generateExplanation,
  generateQuickFix,
  crossReferenceMemory,
  ERROR_CLASSIFICATIONS,
};
