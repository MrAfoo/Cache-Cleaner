'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const semver = require('semver');
const pkg = require('../package.json');
const chalk = require('chalk');

const CACHE_FILE = 'last-update-check.json';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
const TIMEOUT_MS = 1500;

function getCachePath() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const dir = path.join(appData, 'sys-cache-clear');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, CACHE_FILE);
}

function readCache() {
  try {
    const cachePath = getCachePath();
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(content);
    }
  } catch {
    // ignore
  }
  return null;
}

function writeCache(data) {
  try {
    const cachePath = getCachePath();
    fs.writeFileSync(cachePath, JSON.stringify(data), 'utf8');
  } catch {
    // ignore
  }
}

async function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const req = https.get('https://registry.npmjs.org/sys-cache-clear/latest', { timeout: TIMEOUT_MS }, (res) => {
      if (res.statusCode !== 200) {
        req.destroy();
        return reject(new Error('Non-200 status'));
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.version);
        } catch {
          reject(new Error('Parse error'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function checkForUpdate() {
  try {
    const cache = readCache();
    const now = Date.now();

    if (cache && cache.timestamp && (now - cache.timestamp < CACHE_TTL)) {
      // Use cached result if it's within TTL and update is available
      // Note: If they updated locally, the cache might say an update is available but current version handles it.
      if (semver.gt(cache.latestVersion, pkg.version)) {
        return { updateAvailable: true, latestVersion: cache.latestVersion, currentVersion: pkg.version };
      }
      return { updateAvailable: false };
    }

    const latestVersion = await fetchLatestVersion();
    
    if (latestVersion) {
      writeCache({ timestamp: now, latestVersion });

      if (semver.gt(latestVersion, pkg.version)) {
        return { updateAvailable: true, latestVersion, currentVersion: pkg.version };
      }
    }
  } catch {
    // fail silently
  }

  return { updateAvailable: false };
}

function printUpdateNotice(updateResult) {
  if (updateResult && updateResult.updateAvailable) {
    console.log();
    console.log(chalk.cyan(`  ℹ A newer version (${updateResult.latestVersion}) is available. Run: npm update -g sys-cache-clear`));
    console.log();
  }
}

module.exports = { checkForUpdate, printUpdateNotice };
