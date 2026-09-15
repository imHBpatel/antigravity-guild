'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  extractJsTsSymbols,
  extractPythonSymbols,
  extractGoSymbols,
  extractRustSymbols,
  generateRepoMap,
} = require('../lib/repomap');

console.log('🧪 Running AST Symbol Repo-Map Unit Tests...');

// 1. JS/TS Symbol Extraction
{
  const jsContent = `
export interface UserDTO {
  id: string;
}

export type UserRole = 'admin' | 'user';

export class UserService extends BaseService {
  async findUser(id: string) {
    return { id };
  }
}

export async function createUser(data: UserDTO) {
  return data;
}

export const helper = (x) => x * 2;
`;

  const symbols = extractJsTsSymbols(jsContent);
  const names = symbols.map(s => s.name);
  assert(names.includes('UserDTO'), 'Expected interface UserDTO');
  assert(names.includes('UserRole'), 'Expected type UserRole');
  assert(names.includes('UserService'), 'Expected class UserService');
  assert(names.includes('findUser'), 'Expected method findUser');
  assert(names.includes('createUser'), 'Expected function createUser');
  assert(names.includes('helper'), 'Expected arrow function helper');
  console.log('  ✔ JS/TS symbol extraction verified');
}

// 2. Python Symbol Extraction
{
  const pyContent = `
class NeuralNetwork(nn.Module):
    def __init__(self, layers: int):
        self.layers = layers

    async def forward(self, x: Tensor) -> Tensor:
        return x

async def train_model(epochs: int) -> bool:
    return True
`;

  const symbols = extractPythonSymbols(pyContent);
  const names = symbols.map(s => s.name);
  assert(names.includes('NeuralNetwork'), 'Expected class NeuralNetwork');
  assert(names.includes('__init__'), 'Expected method __init__');
  assert(names.includes('forward'), 'Expected method forward');
  assert(names.includes('train_model'), 'Expected function train_model');
  console.log('  ✔ Python symbol extraction verified');
}

// 3. Go Symbol Extraction
{
  const goContent = `
package main

type Config struct {
    Port int
}

type Server interface {
    Start() error
}

func (c *Config) Validate() bool {
    return c.Port > 0
}

func NewServer(cfg Config) Server {
    return nil
}
`;

  const symbols = extractGoSymbols(goContent);
  const names = symbols.map(s => s.name);
  assert(names.includes('Config'), 'Expected struct Config');
  assert(names.includes('Server'), 'Expected interface Server');
  assert(names.includes('Validate'), 'Expected method Validate');
  assert(names.includes('NewServer'), 'Expected function NewServer');
  console.log('  ✔ Go symbol extraction verified');
}

// 4. Rust Symbol Extraction
{
  const rustContent = `
pub struct CacheConfig {
    pub ttl: u64,
}

pub enum CacheStatus {
    Hit,
    Miss,
}

pub trait Storage {
    fn get(&self, key: &str) -> Option<String>;
}

impl Storage for CacheConfig {
    pub async fn evict(&self) -> bool {
        true
    }
}

pub fn initialize_pool(size: usize) -> Result<(), Error> {
    Ok(())
}
`;

  const symbols = extractRustSymbols(rustContent);
  const names = symbols.map(s => s.name);
  assert(names.includes('CacheConfig'), 'Expected struct CacheConfig');
  assert(names.includes('CacheStatus'), 'Expected enum CacheStatus');
  assert(names.includes('Storage'), 'Expected trait Storage');
  assert(names.includes('initialize_pool'), 'Expected function initialize_pool');
  console.log('  ✔ Rust symbol extraction verified');
}

// 5. Full generateRepoMap Pipeline on Temporary Directory
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openguild-repomap-'));

  try {
    fs.writeFileSync(path.join(tmpDir, 'auth.ts'), `
export interface AuthToken {
  token: string;
}
export function verifyToken(t: string) { return true; }
`);

    fs.writeFileSync(path.join(tmpDir, 'server.py'), `
class APIServer:
    def serve(self):
        pass
`);

    // Basic map generation
    const resAll = generateRepoMap(tmpDir);
    assert(resAll.filesCount === 2, `Expected 2 files, got ${resAll.filesCount}`);
    assert(resAll.symbolsCount >= 3, `Expected at least 3 symbols, got ${resAll.symbolsCount}`);
    assert(resAll.mapMarkdown.includes('auth.ts'), 'Expected auth.ts in map');
    assert(resAll.mapMarkdown.includes('server.py'), 'Expected server.py in map');

    // Query filter
    const resFiltered = generateRepoMap(tmpDir, { query: 'verifyToken' });
    assert(resFiltered.matchedFilesCount === 1, 'Expected 1 matched file for verifyToken');
    assert(resFiltered.mapMarkdown.includes('verifyToken'), 'Expected verifyToken in filtered map');
    assert(!resFiltered.mapMarkdown.includes('server.py'), 'server.py should be filtered out');

    // Token budget truncation
    const resTruncated = generateRepoMap(tmpDir, { maxTokens: 20 });
    assert(resTruncated.mapMarkdown.includes('Truncated'), 'Expected truncation message for tight budget');

    console.log('  ✔ generateRepoMap directory scanning, query filtering & token budgeting verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('✨ All AST Symbol Repo-Map Tests Passed!\n');
