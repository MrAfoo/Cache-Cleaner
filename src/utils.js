'use strict';

/**
 * Converts a byte count to a human-readable string (KB, MB, GB).
 *
 * @param {number} bytes - The number of bytes.
 * @returns {string} Human-readable size string.
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(2)} ${units[i]}`;
}

/**
 * Checks whether the current process is running with Administrator
 * privileges on Windows.
 *
 * Uses `net session` — it succeeds only under an elevated prompt.
 *
 * @returns {Promise<boolean>} true if running as admin, false otherwise.
 */
async function isAdmin() {
  if (require('os').platform() !== 'win32') {
    // On non-Windows, check for root (uid 0)
    return process.getuid && process.getuid() === 0;
  }

  const { execSync } = require('child_process');

  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

module.exports = { formatBytes, isAdmin };
