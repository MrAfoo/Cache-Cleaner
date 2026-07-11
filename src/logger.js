'use strict';

const chalk = require('chalk');
const path = require('path');

const SEPARATOR = '──────────────────────────────────────────';

/**
 * Maps raw error codes to human-readable labels.
 */
const ERROR_LABELS = {
  EBUSY: 'in use',
  EPERM: 'permission denied',
  EACCES: 'access denied',
  ENOENT: 'file not found',
  EMFILE: 'too many open files',
  ENOTEMPTY: 'directory not empty',
};

/**
 * Returns a plain-language label for an error code, falling back to
 * the raw code if no mapping exists.
 *
 * @param {string} code - Raw error code (e.g. "EBUSY").
 * @returns {string}
 */
function friendlyReason(code) {
  return ERROR_LABELS[code] || code;
}

/**
 * Prints a colored cleanup summary to the console.
 *
 * @param {{ deleted: number, skipped: number, bytesFreed: number, errors?: { path: string, reason: string }[] }} summary
 * @param {{ verbose?: boolean }} [options]
 */
function logSummary(summary, options = {}) {
  const { formatBytes } = require('./utils');
  const verbose = options.verbose || false;

  console.log();
  console.log(chalk.dim(`  ${SEPARATOR}`));
  console.log(chalk.bold.underline('  Cleanup Summary'));
  console.log();
  console.log(chalk.green(`  ✔ Files deleted:  ${summary.deleted}`));
  console.log(chalk.yellow(`  ⚠ Files skipped:  ${summary.skipped}`));
  console.log(chalk.cyan(`  💾 Space freed:    ${formatBytes(summary.bytesFreed)}`));

  if (summary.errors && summary.errors.length > 0) {
    console.log();

    if (verbose) {
      // ── Verbose: full paths, raw codes, no limit ──
      console.log(chalk.dim('  Skipped files (verbose):'));

      let index = 1;
      for (const err of summary.errors) {
        console.log(chalk.dim(`    ${index}. ${err.path}`));
        console.log(chalk.dim(`       Reason: ${err.reason}`));
        index++;
      }
    } else {
      // ── Default: grouped by reason, basenames only, limit 5 per group ──
      const grouped = groupByReason(summary.errors);

      for (const [reason, files] of Object.entries(grouped)) {
        const label = friendlyReason(reason);
        console.log(chalk.dim(`  Skipped — ${label} (${files.length}):`));

        const limit = 5;
        const shown = files.slice(0, limit);

        shown.forEach((filePath, i) => {
          console.log(chalk.dim(`    ${i + 1}. ${path.basename(filePath)}`));
        });

        if (files.length > limit) {
          console.log(chalk.dim(`    ... and ${files.length - limit} more (use --verbose to see all)`));
        }
      }
    }
  }

  console.log(chalk.dim(`  ${SEPARATOR}`));
  console.log();
}

/**
 * Groups error entries by their reason code.
 *
 * @param {{ path: string, reason: string }[]} errors
 * @returns {Record<string, string[]>} Map of reason -> array of file paths.
 */
function groupByReason(errors) {
  const groups = {};
  for (const err of errors) {
    if (!groups[err.reason]) {
      groups[err.reason] = [];
    }
    groups[err.reason].push(err.path);
  }
  return groups;
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
