'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

/**
 * Recursively scans a folder and collects information about all files
 * without deleting anything.
 *
 * @param {string} folderPath - Absolute path to the folder to scan.
 * @returns {Promise<{ fileCount: number, totalBytes: number, files: { path: string, size: number }[] }>}
 */
async function scanFolder(folderPath) {
  const result = {
    fileCount: 0,
    totalBytes: 0,
    files: [],
  };

  await walk(folderPath, result);

  return result;
}

/**
 * Internal recursive directory walker.
 *
 * @param {string} dir - Current directory path.
 * @param {{ fileCount: number, totalBytes: number, files: { path: string, size: number }[] }} result - Accumulator object.
 */
async function walk(dir, result) {
  let entries;

  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    // Directory might be inaccessible — skip silently
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    try {
      if (entry.isDirectory()) {
        await walk(fullPath, result);
      } else if (entry.isFile()) {
        const stat = await fsp.stat(fullPath);
        result.fileCount++;
        result.totalBytes += stat.size;
        result.files.push({ path: fullPath, size: stat.size });
      }
    } catch {
      // Individual file stat failures are non-fatal — skip
    }
  }
}

module.exports = { scanFolder };
