#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const { getTargets } = require('../src/targets');
const { scanFolder } = require('../src/scanner');
const { cleanFolder } = require('../src/cleaner');
const { confirmPrompt } = require('../src/prompt');
const { logSummary, logScanResult, logInfo, logWarning, logError, logSuccess } = require('../src/logger');
const { formatBytes, isAdmin } = require('../src/utils');

const pkg = require('../package.json');

const program = new Command();

program
  .name('clearcache')
  .description('CLI tool to clear temporary and junk files from your system')
  .version(pkg.version);

// ─── list ────────────────────────────────────────────────────────────────────

program
  .command('list')
  .description('List all known target cache folders without scanning them')
  .action(() => {
    const targets = getTargets();

    if (targets.length === 0) {
      logWarning('No targets defined for this operating system.');
      return;
    }

    console.log();
    console.log(chalk.bold.underline('Cache Targets'));
    console.log();
    for (const target of targets) {
      console.log(`  ${chalk.cyan(target.name.padEnd(12))} ${chalk.dim(target.path)}`);
    }
    console.log();
  });

// ─── scan ────────────────────────────────────────────────────────────────────

program
  .command('scan')
  .description('Read-only scan: show file count and total size per target folder')
  .action(async () => {
    const targets = getTargets();

    if (targets.length === 0) {
      logWarning('No targets defined for this operating system.');
      return;
    }

    const admin = await isAdmin();

    console.log();
    console.log(chalk.bold.underline('Scan Results'));
    console.log();

    let grandTotalFiles = 0;
    let grandTotalBytes = 0;

    for (const target of targets) {
      // Skip prefetch if not admin
      if (target.name === 'prefetch' && !admin) {
        logWarning(`Skipping "${target.name}" — requires Administrator privileges.`);
        logInfo('Re-run this command as Administrator to include Prefetch.');
        continue;
      }

      const spinner = ora({ text: `Scanning ${target.name}...`, spinner: 'dots' }).start();

      try {
        const result = await scanFolder(target.path);
        spinner.succeed(`${target.name} scanned`);
        logScanResult(target.name, result);
        grandTotalFiles += result.fileCount;
        grandTotalBytes += result.totalBytes;
      } catch (err) {
        spinner.fail(`Failed to scan ${target.name}: ${err.message}`);
      }
    }

    console.log();
    console.log(chalk.bold(`  Total: ${grandTotalFiles} files, ${formatBytes(grandTotalBytes)}`));
    console.log();
  });

// ─── clean ───────────────────────────────────────────────────────────────────

program
  .command('clean')
  .description('Scan and delete temporary/junk files')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--dry-run', 'Show what would be deleted without deleting anything')
  .option('--target <name>', 'Only clean a specific target (e.g. "temp" or "prefetch")')
  .action(async (options) => {
    let targets = getTargets();

    if (targets.length === 0) {
      logWarning('No targets defined for this operating system.');
      return;
    }

    // Filter to a specific target if --target is provided
    if (options.target) {
      const match = targets.find(
        (t) => t.name.toLowerCase() === options.target.toLowerCase()
      );
      if (!match) {
        logError(`Unknown target "${options.target}". Use "clearcache list" to see available targets.`);
        process.exitCode = 1;
        return;
      }
      targets = [match];
    }

    const admin = await isAdmin();

    // ── Phase 1: Scan ──────────────────────────────────────────────────────

    console.log();
    console.log(chalk.bold.underline('Scanning targets...'));
    console.log();

    /** @type {{ target: { name: string, path: string }, scan: { fileCount: number, totalBytes: number, files: { path: string, size: number }[] } }[]} */
    const scanResults = [];

    for (const target of targets) {
      // Admin check for prefetch
      if (target.name === 'prefetch' && !admin) {
        logWarning(`Skipping "${target.name}" — requires Administrator privileges.`);
        logInfo('Re-run this command as Administrator to include Prefetch.');
        continue;
      }

      const spinner = ora({ text: `Scanning ${target.name}...`, spinner: 'dots' }).start();

      try {
        const result = await scanFolder(target.path);
        spinner.succeed(`${target.name} — ${result.fileCount} files, ${formatBytes(result.totalBytes)}`);
        scanResults.push({ target, scan: result });
      } catch (err) {
        spinner.fail(`Failed to scan ${target.name}: ${err.message}`);
      }
    }

    const totalFiles = scanResults.reduce((sum, r) => sum + r.scan.fileCount, 0);
    const totalBytes = scanResults.reduce((sum, r) => sum + r.scan.totalBytes, 0);

    if (totalFiles === 0) {
      logSuccess('Nothing to clean — all target folders are empty.');
      return;
    }

    console.log();
    console.log(chalk.bold(`  Found ${totalFiles} files (${formatBytes(totalBytes)}) across ${scanResults.length} target(s).`));
    console.log();

    // ── Phase 2: Dry-run ───────────────────────────────────────────────────

    if (options.dryRun) {
      console.log(chalk.bold.underline('Dry Run — files that would be deleted:'));
      console.log();

      for (const { target, scan } of scanResults) {
        console.log(chalk.cyan(`  [${target.name}]`));
        for (const file of scan.files) {
          console.log(chalk.dim(`    ${file.path}  (${formatBytes(file.size)})`));
        }
      }

      console.log();
      logInfo('Dry run complete. No files were deleted.');
      return;
    }

    // ── Phase 3: Confirm ───────────────────────────────────────────────────

    if (!options.yes) {
      const confirmed = await confirmPrompt(
        `Delete ${totalFiles} files (${formatBytes(totalBytes)}) from ${scanResults.length} target(s)?`
      );
      if (!confirmed) {
        logInfo('Cleanup cancelled.');
        return;
      }
    }

    // ── Phase 4: Clean ─────────────────────────────────────────────────────

    const aggregated = {
      deleted: 0,
      skipped: 0,
      bytesFreed: 0,
      errors: [],
    };

    for (const { target, scan } of scanResults) {
      const spinner = ora({ text: `Cleaning ${target.name}...`, spinner: 'dots' }).start();

      const result = await cleanFolder(scan.files);

      spinner.succeed(`${target.name} — ${result.deleted} deleted, ${result.skipped} skipped`);

      aggregated.deleted += result.deleted;
      aggregated.skipped += result.skipped;
      aggregated.bytesFreed += result.bytesFreed;
      aggregated.errors.push(...result.errors);
    }

    logSummary(aggregated);
  });

// ─── Parse ───────────────────────────────────────────────────────────────────

program.parse(process.argv);
