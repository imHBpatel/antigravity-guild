# 🏛️ System Patterns & Architecture

## 1. Domain Boundaries & Design Principles
- Single-responsibility modules with explicit function exports.
- Zero-dependency philosophy for high speed, portability, and zero security supply-chain attack surface.
- Strict input sanitization and secret scrubbing before persisting any data.

## 2. Invariant Verification Loop
- Automated test suites must pass before any pull request or task completion.
- Linters and typechecks run as non-blocking or blocking pre-commit gates.
