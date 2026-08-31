# Contributing to OpenGuild

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/imHBpatel/antigravity-guild.git
cd antigravity-guild

# Test locally
node bin/cli.js --help
node bin/cli.js --version
```

No dependencies to install — the entire project is a single Node.js file with zero external packages.

## Making Changes

1. **Fork** the repository and create a feature branch from `main`.
2. Make your changes in `bin/cli.js`.
3. Test locally by running `node bin/cli.js` in a sample project directory.
4. Ensure `--help` and `--version` flags still work correctly.
5. Update `CHANGELOG.md` with a description of your change under `## [Unreleased]`.

## Code Style

- **No external dependencies.** This project ships as a zero-dependency CLI.
- Use `'use strict'` at the top of all files.
- Use clear, descriptive variable names.
- Add JSDoc comments to all functions.
- Handle errors explicitly — never swallow them with empty `catch` blocks.

## Pull Request Process

1. Fill out the PR template with a description of your change.
2. Ensure your code runs without errors on Node.js 16+.
3. Keep PRs focused — one feature or fix per PR.
4. Update documentation if your change affects user-facing behavior.

## Adding Stack Detection

To add support for a new language or framework:

1. Add a detection clause in the `detectStack()` function in `bin/cli.js`.
2. Set the correct `lang`, `framework`, `pkgManager`, `testCmd`, `lintCmd`, and `typecheckCmd`.
3. Update the "Stack Detection" table in `README.md`.
4. Add an entry to `CHANGELOG.md`.

## Reporting Issues

Open an issue at [github.com/imHBpatel/antigravity-guild/issues](https://github.com/imHBpatel/antigravity-guild/issues) with:

- Your Node.js version (`node --version`)
- Your operating system
- Steps to reproduce the issue
- Expected vs. actual behavior

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
