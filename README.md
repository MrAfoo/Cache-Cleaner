Give a Star⭐ if you like it

# System Cache Cleaner

> CLI tool to clear temporary and junk files from your Windows system.

Clears files from known safe locations — **Temp folders** and **Windows Prefetch** — with full control over what gets deleted. Built with extensibility for Mac/Linux support in the future.

[![npm version](https://img.shields.io/npm/v/sys-cache-clear.svg)](https://www.npmjs.com/package/sys-cache-clear)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Requirements

- Node.js 16 or higher
- Windows OS (Mac/Linux support planned)

## Installation

```bash
npm install -g sys-cache-clear
```

Or run directly from the project folder:

```bash
npm install
node bin/sys-cache-clear.js --help
```

## Commands

### `sys-cache-clear list`

Lists all known target cache folders without scanning them.

```
$ sys-cache-clear list

Cache Targets

  temp         C:\Users\You\AppData\Local\Temp
  prefetch     C:\Windows\Prefetch
```

### `sys-cache-clear scan`

Read-only scan. Shows file count and total size for each target folder. **Does not delete anything.**

```
$ sys-cache-clear scan

Scan Results

  ✔ temp scanned
    📁 temp — 1,247 files, 523.41 MB
  ⚠ Skipping "prefetch" — requires Administrator privileges.

  Total: 1,247 files, 523.41 MB
```

### `sys-cache-clear clean`

Scans all targets, shows a summary, asks for confirmation, then deletes files.

```
$ sys-cache-clear clean

Scanning targets...

  ✔ temp — 1,247 files, 523.41 MB

  Found 1,247 files (523.41 MB) across 1 target(s).

? Delete 1,247 files (523.41 MB) from 1 target(s)? (y/N)
```

### Options

| Flag | Description |
|------|-------------|
| `--yes`, `-y` | Skip the confirmation prompt |
| `--dry-run` | Show exactly what would be deleted, but don't delete anything |
| `--target <name>` | Only clean a specific target (e.g. `temp` or `prefetch`) |
| `--exclude <pattern>` | Exclude files matching a glob pattern (repeatable) |
| `--verbose` | Show full skipped file list with paths and raw error codes |

> **Glob patterns:** `--exclude` uses standard glob syntax. `*` matches any sequence of characters. Patterns are matched against filenames (not full paths). Examples: `"*.exe"`, `"antigravity*"`, `"*.log"`.

### Examples

```bash
# Skip confirmation
sys-cache-clear clean --yes

# Preview what would be deleted
sys-cache-clear clean --dry-run

# Clean only the temp folder
sys-cache-clear clean --target temp

# Clean prefetch (requires Administrator)
sys-cache-clear clean --target prefetch

# Exclude specific files/patterns from deletion
sys-cache-clear clean --exclude "*.exe" --exclude "antigravity*"

# Combine flags: dry-run with exclusions
sys-cache-clear clean --dry-run --exclude "*.log"
```

### `sys-cache-clear --version`

Prints the current version.

### `sys-cache-clear --help`

Shows help text with all available commands and options.

## Prefetch & Administrator

The Windows **Prefetch** folder (`C:\Windows\Prefetch`) requires Administrator privileges to access. If you run `sys-cache-clear` without elevation, Prefetch will be **skipped automatically** with a warning message. To include it:

1. Open **Command Prompt** or **PowerShell** as Administrator
2. Run `sys-cache-clear clean`

## Targets

| Name | Path | Notes |
|------|------|-------|
| `temp` | `%TEMP%` | User's temp folder |
| `tmp` | `%TMP%` | Only included if different from `%TEMP%` |
| `prefetch` | `%WINDIR%\Prefetch` | Requires admin |

The tool **never** touches folders outside this defined list.

## Project Structure

```
sys-cache-clear/
├── bin/
│   └── sys-cache-clear.js    # CLI entry point (commander)
├── src/
│   ├── targets.js       # OS-specific target definitions
│   ├── scanner.js       # Recursive file scanner
│   ├── cleaner.js       # File deletion with per-file error handling
│   ├── prompt.js        # Confirmation prompt (inquirer)
│   ├── logger.js        # Colored output (chalk)
│   └── utils.js         # formatBytes, isAdmin
├── package.json
└── README.md
```

## Safety

- **No guessing**: Only explicitly defined target folders are ever touched.
- **Per-file try/catch**: A single locked or permission-denied file is skipped — it never crashes the operation.
- **Dry-run support**: Always preview before deleting with `--dry-run`.
- **Confirmation by default**: The `clean` command asks before deleting unless `--yes` is passed.

## Contributing

Found a bug or have a suggestion? Open an issue or submit a pull request on GitHub.

## License

MIT

## Links

- [npm package](https://www.npmjs.com/package/sys-cache-clear)
- [GitHub repo](https://github.com/MrAfoo/Cache-Cleaner)
- [Issues](https://github.com/MrAfoo/Cache-Cleaner/issues)
