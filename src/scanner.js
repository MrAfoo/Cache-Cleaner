'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { matchesExclude } = require('./utils');

async function scanFolder(folderPath, excludePatterns = []) {
  const result = {
    fileCount: 0,
    totalBytes: 0,
    files: [],
    excluded: [],
  };

  await walk(folderPath, result, excludePatterns);

  return result;
}

async function walk(dir, result, excludePatterns) {
  let entries;

  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    try {
      if (entry.isDirectory()) {
        await walk(fullPath, result, excludePatterns);
      } else if (entry.isFile()) {
        const stat = await fsp.stat(fullPath);

        if (excludePatterns.length > 0 && matchesExclude(entry.name, excludePatterns)) {
          result.excluded.push({ path: fullPath, size: stat.size });
          continue;
        }

        result.fileCount++;
        result.totalBytes += stat.size;
        result.files.push({ path: fullPath, size: stat.size });
      }
    } catch {
      // skip
    }
  }
}

module.exports = { scanFolder };
