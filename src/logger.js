'use strict';

const chalk = require('chalk');

/**
 * Prints a colored cleanup summary to the console.
 *
 * @param {{ deleted: number, skipped: number, bytesFreed: number, errors?: { path: string, reason: string }[] }} summary
 */
function logSummary(summary) {
  const { formatBytes } = require('./utils');

  console.log();
  console.log(chalk.bold.underline('Cleanup Summary'));
  console.log(chalk.green(`  ✔ Files deleted:  ${summary.deleted}`));
  console.log(chalk.yellow(`  ⚠ Files skipped:  ${summary.skipped}`));
  console.log(chalk.cyan(`  💾 Space freed:   ${formatBytes(summary.bytesFreed)}`));

  if (summary.errors && summary.errors.length > 0) {
    console.log();
    console.log(chalk.dim(`  Skipped files (first ${Math.min(summary.errors.length, 10)}):`));
    const shown = summary.errors.slice(0, 10);
    for (const err of shown) {
      console.log(chalk.dim(`    • ${err.path}`));
      console.log(chalk.dim(`      Reason: ${err.reason}`));
    }
    if (summary.errors.length > 10) {
      console.log(chalk.dim(`    ... and ${summary.errors.length - 10} more`));
    }
  }

  console.log();
}

/**
 * Prints scan results for a single target folder.
 *
 * @param {string} name - Target name (e.g. "temp", "prefetch").
 * @param {{ fileCount: number, totalBytes: number }} scanResult
 */
function logScanResult(name, scanResult) {
  const { formatBytes } = require('./utils');

  console.log(
    chalk.bold(`  📁 ${name}`) +
    chalk.white(` — ${scanResult.fileCount} files, ${formatBytes(scanResult.totalBytes)}`)
  );
}

/**
 * Prints an informational message.
 *
 * @param {string} msg
 */
function logInfo(msg) {
  console.log(chalk.blue(`ℹ ${msg}`));
}

/**
 * Prints a warning message.
 *
 * @param {string} msg
 */
function logWarning(msg) {
  console.log(chalk.yellow(`⚠ ${msg}`));
}

/**
 * Prints an error message.
 *
 * @param {string} msg
 */
function logError(msg) {
  console.log(chalk.red(`✖ ${msg}`));
}

/**
 * Prints a success message.
 *
 * @param {string} msg
 */
function logSuccess(msg) {
  console.log(chalk.green(`✔ ${msg}`));
}

module.exports = { logSummary, logScanResult, logInfo, logWarning, logError, logSuccess };
