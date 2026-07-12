'use strict';

const fsp = require('fs').promises;
const path = require('path');
const { matchesExclude } = require('./utils');

async function cleanFolder(files, excludePatterns = []) {
  const result = {
    deleted: 0,
    skipped: 0,
    excluded: 0,
    bytesFreed: 0,
    errors: [],
  };

  for (const file of files) {
    if (excludePatterns.length > 0 && matchesExclude(path.basename(file.path), excludePatterns)) {
      result.excluded++;
      continue;
    }

    try {
      await fsp.rm(file.path, { force: true });
      result.deleted++;
      result.bytesFreed += file.size;
    } catch (err) {
      result.skipped++;
      result.errors.push({
        path: file.path,
        reason: err.code || err.message,
      });
    }
  }

  return result;
}

module.exports = { cleanFolder };
