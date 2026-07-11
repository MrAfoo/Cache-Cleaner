'use strict';

const fsp = require('fs').promises;

/**
 * Deletes all files in the given list one-by-one.
 * Each deletion is wrapped in its own try/catch so a single locked or
 * permission-denied file never crashes the entire operation.
 *
 * @param {{ path: string, size: number }[]} files - Array of file objects from scanFolder.
 * @returns {Promise<{ deleted: number, skipped: number, bytesFreed: number, errors: { path: string, reason: string }[] }>}
 */
async function cleanFolder(files) {
  const result = {
    deleted: 0,
    skipped: 0,
    bytesFreed: 0,
    errors: [],
  };

  for (const file of files) {
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
