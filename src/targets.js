'use strict';

const os = require('os');
const path = require('path');

function getTargets() {
  const platform = os.platform();

  if (platform === 'win32') {
    const targets = [];

    if (process.env.TEMP) {
      targets.push({
        name: 'temp',
        path: process.env.TEMP,
      });
    }

    if (process.env.TMP && process.env.TMP !== process.env.TEMP) {
      targets.push({
        name: 'tmp',
        path: process.env.TMP,
      });
    }

    if (process.env.WINDIR) {
      targets.push({
        name: 'prefetch',
        path: path.join(process.env.WINDIR, 'Prefetch'),
      });
    }

    return targets;
  }

  return [];
}

module.exports = { getTargets };
