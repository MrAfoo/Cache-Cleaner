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
  .name('sys-cache-clear')
  .description('CLI tool to clear temporary and junk files from your system')
  .version(pkg.version);

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

function collectExclude(value, previous) {
  return previous.concat([value]);
}

program
  .command('clean')
  .description('Scan and delete temporary/junk files')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--dry-run', 'Show what would be deleted without deleting anything')
  .option('--target <name>', 'Only clean a specific target (e.g. "temp" or "prefetch")')
  .option('--verbose', 'Show full skipped file list with paths and raw error codes')
  .option('--exclude <pattern>', 'Exclude files matching a glob pattern (repeatable)', collectExclude, [])
  .action(async (options) => {
    let targets = getTargets();

    if (targets.length === 0) {
      logWarning('No targets defined for this operating system.');
      return;
    }

    if (options.target) {
      const match = targets.find(
        (t) => t.name.toLowerCase() === options.target.toLowerCase()
      );
      if (!match) {
        logError(`Unknown target "${options.target}". Use "sys-cache-clear list" to see available targets.`);
        process.exitCode = 1;
        return;
      }
      targets = [match];
    }

    const admin = await isAdmin();
    const excludePatterns = options.exclude || [];

    if (excludePatterns.length > 0) {
      logInfo(`Exclude patterns: ${excludePatterns.map(p => `"${p}"`).join(', ')}`);
    }

    console.log();
    console.log(chalk.bold.underline('Scanning targets...'));
    console.log();

    const scanResults = [];
    let totalExcluded = 0;

    for (const target of targets) {
      if (target.name === 'prefetch' && !admin) {
        logWarning(`Skipping "${target.name}" — requires Administrator privileges.`);
        logInfo('Re-run this command as Administrator to include Prefetch.');
        continue;
      }

      const spinner = ora({ text: `Scanning ${target.name}...`, spinner: 'dots' }).start();

      try {
        const result = await scanFolder(target.path, excludePatterns);
        const excludedCount = result.excluded.length;
        totalExcluded += excludedCount;

        let msg = `${target.name} — ${result.fileCount} files, ${formatBytes(result.totalBytes)}`;
        if (excludedCount > 0) {
          msg += chalk.magenta(` (${excludedCount} excluded)`);
        }
        spinner.succeed(msg);

        scanResults.push({ target, scan: result });
      } catch (err) {
        spinner.fail(`Failed to scan ${target.name}: ${err.message}`);
      }
    }

    const totalFiles = scanResults.reduce((sum, r) => sum + r.scan.fileCount, 0);
    const totalBytes = scanResults.reduce((sum, r) => sum + r.scan.totalBytes, 0);

    if (totalFiles === 0) {
      if (totalExcluded > 0) {
        logInfo(`All files matched --exclude patterns (${totalExcluded} excluded). Nothing to clean.`);
      } else {
        logSuccess('Nothing to clean — all target folders are empty.');
      }
      return;
    }

    console.log();
    let foundMsg = `  Found ${totalFiles} files (${formatBytes(totalBytes)}) across ${scanResults.length} target(s).`;
    if (totalExcluded > 0) {
      foundMsg += chalk.magenta(` [${totalExcluded} excluded by patterns]`);
    }
    console.log(chalk.bold(foundMsg));
    console.log();

    if (options.dryRun) {
      console.log(chalk.bold.underline('Dry Run — files that would be deleted:'));
      console.log();

      for (const { target, scan } of scanResults) {
        console.log(chalk.cyan(`  [${target.name}]`));
        for (const file of scan.files) {
          console.log(chalk.dim(`    ${file.path}  (${formatBytes(file.size)})`));
        }

        if (scan.excluded.length > 0) {
          console.log(chalk.magenta(`  [${target.name} — excluded by patterns]`));
          for (const file of scan.excluded) {
            console.log(chalk.magenta.dim(`    ⊘ ${file.path}  (${formatBytes(file.size)})`));
          }
        }
      }

      console.log();
      logInfo('Dry run complete. No files were deleted.');
      return;
    }

    if (!options.yes) {
      let promptMsg = `Delete ${totalFiles} files (${formatBytes(totalBytes)}) from ${scanResults.length} target(s)?`;
      if (totalExcluded > 0) {
        promptMsg += ` [excluding ${totalExcluded} matched patterns]`;
      }
      const confirmed = await confirmPrompt(promptMsg);
      if (!confirmed) {
        logInfo('Cleanup cancelled.');
        return;
      }
    }

    const aggregated = {
      deleted: 0,
      skipped: 0,
      excluded: 0,
      bytesFreed: 0,
      errors: [],
    };

    for (const { target, scan } of scanResults) {
      const spinner = ora({ text: `Cleaning ${target.name}...`, spinner: 'dots' }).start();

      const result = await cleanFolder(scan.files, excludePatterns);

      spinner.succeed(`${target.name} — ${result.deleted} deleted, ${result.skipped} skipped`);

      aggregated.deleted += result.deleted;
      aggregated.skipped += result.skipped;
      aggregated.excluded += result.excluded;
      aggregated.bytesFreed += result.bytesFreed;
      aggregated.errors.push(...result.errors);
    }

    aggregated.excluded += totalExcluded;

    logSummary(aggregated, { verbose: options.verbose });
  });

program.parse(process.argv);
