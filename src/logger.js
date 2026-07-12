'use strict';

const chalk = require('chalk');
const path = require('path');

const SEPARATOR = '──────────────────────────────────────────';

const ERROR_LABELS = {
  EBUSY: 'in use',
  EPERM: 'permission denied',
  EACCES: 'access denied',
  ENOENT: 'file not found',
  EMFILE: 'too many open files',
  ENOTEMPTY: 'directory not empty',
};

function friendlyReason(code) {
  return ERROR_LABELS[code] || code;
}

function logSummary(summary, options = {}) {
  const { formatBytes } = require('./utils');
  const verbose = options.verbose || false;

  console.log();
  console.log(chalk.dim(`  ${SEPARATOR}`));
  console.log('  ' + chalk.bold.underline('Cleanup Summary'));
  console.log();
  console.log(chalk.green(`  ✔ Files deleted:   ${summary.deleted}`));
  if (summary.excluded > 0) {
    console.log(chalk.magenta(`  ⊘ Files excluded:  ${summary.excluded} (matched --exclude patterns)`));
  }
  console.log(chalk.yellow(`  ⚠ Files skipped:   ${summary.skipped} (in use / permission denied)`));
  console.log(chalk.cyan(`  💾 Space freed:     ${formatBytes(summary.bytesFreed)}`));

  if (summary.errors && summary.errors.length > 0) {
    console.log();

    if (verbose) {
      console.log(chalk.dim('  Skipped files (verbose):'));

      let index = 1;
      for (const err of summary.errors) {
        console.log(chalk.dim(`    ${index}. ${err.path}`));
        console.log(chalk.dim(`       Reason: ${err.reason}`));
        index++;
      }
    } else {
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

function logScanResult(name, scanResult) {
  const { formatBytes } = require('./utils');

  console.log(
    chalk.bold(`  📁 ${name}`) +
    chalk.white(` — ${scanResult.fileCount} files, ${formatBytes(scanResult.totalBytes)}`)
  );
}

function logInfo(msg) {
  console.log(chalk.blue(`ℹ ${msg}`));
}

function logWarning(msg) {
  console.log(chalk.yellow(`⚠ ${msg}`));
}

function logError(msg) {
  console.log(chalk.red(`✖ ${msg}`));
}

function logSuccess(msg) {
  console.log(chalk.green(`✔ ${msg}`));
}

module.exports = { logSummary, logScanResult, logInfo, logWarning, logError, logSuccess };
