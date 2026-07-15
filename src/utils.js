'use strict';

const { minimatch } = require('minimatch');
const { execSync } = require('child_process');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(2)} ${units[i]}`;
}

async function isAdmin() {
  if (require('os').platform() !== 'win32') {
    return process.getuid && process.getuid() === 0;
  }

  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function matchesExclude(filename, patterns) {
  if (!patterns || patterns.length === 0) return false;

  for (const pattern of patterns) {
    if (minimatch(filename, pattern, { nocase: true })) {
      return true;
    }
  }

  return false;
}

function runPowerShell(script) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
}
function checkPlatformSupport() {
  return process.platform === 'win32';
}

module.exports = { formatBytes, isAdmin, matchesExclude, runPowerShell, checkPlatformSupport };
