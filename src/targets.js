'use strict';

const os = require('os');
const path = require('path');

/**
 * Returns an array of target cache/junk folders for the current OS.
 * Each target has a `name` (human-readable identifier) and `path` (absolute directory path).
 *
 * Currently supports Windows. Mac/Linux targets can be added here later.
 *
 * @returns {{ name: string, path: string }[]}
 */
function getTargets() {
  const platform = os.platform();

  if (platform === 'win32') {
    const targets = [];

    // User TEMP folder (usually C:\Users\<user>\AppData\Local\Temp)
    if (process.env.TEMP) {
      targets.push({
        name: 'temp',
        path: process.env.TEMP,
      });
    }

    // System TMP folder — only add if it differs from TEMP
    if (process.env.TMP && process.env.TMP !== process.env.TEMP) {
      targets.push({
        name: 'tmp',
        path: process.env.TMP,
      });
    }

    // Windows Prefetch folder (requires admin)
    if (process.env.WINDIR) {
      targets.push({
        name: 'prefetch',
        path: path.join(process.env.WINDIR, 'Prefetch'),
      });
    }

    return targets;
  }

  // TODO: Add macOS targets (~/Library/Caches, /tmp, etc.)
  // TODO: Add Linux targets (/tmp, ~/.cache, etc.)

  return [];
}

module.exports = { getTargets };
