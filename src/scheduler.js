'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { isAdmin } = require('./utils');
const chalk = require('chalk');

const TASK_NAME = 'SysCacheClearAutoRun';

function getLogPath() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const dir = path.join(appData, 'sys-cache-clear');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'schedule.log');
}

async function createScheduledTask(frequency) {
  const admin = await isAdmin();
  
  const logDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const appDir = path.join(logDir, 'sys-cache-clear');
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }
  
  const logPath = path.join(appDir, 'schedule.log');
  const batPath = path.join(appDir, 'run.bat');
  const exePath = process.execPath;
  const scriptPath = path.resolve(__dirname, '..', 'bin', 'sys-cache-clear.js');
  
  // Write a simple batch script to handle redirection cleanly
  const batContent = `"${exePath}" "${scriptPath}" clean --yes >> "${logPath}" 2>&1`;
  fs.writeFileSync(batPath, batContent, 'utf8');
  
  let schtasksCmd = `schtasks /Create /TN "${TASK_NAME}" /TR "\\"${batPath}\\"" /ST 03:00 /F`;
  
  if (frequency === 'daily') {
    schtasksCmd += ` /SC DAILY`;
  } else if (frequency === 'weekly') {
    schtasksCmd += ` /SC WEEKLY /D SUN`;
  } else {
    throw new Error(`Unsupported frequency: ${frequency}`);
  }

  // If the user is admin, run the task elevated to clean Prefetch
  if (admin) {
    schtasksCmd += ` /RL HIGHEST`;
  }

  try {
    execSync(schtasksCmd, { stdio: 'ignore' });
    return { success: true, logPath, elevated: admin };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function removeScheduledTask() {
  try {
    execSync(`schtasks /Delete /TN "${TASK_NAME}" /F`, { stdio: 'ignore' });
    return { success: true };
  } catch (error) {
    // If it fails, it usually means it doesn't exist
    return { success: false, error: error.message };
  }
}

function getTaskStatus() {
  try {
    const output = execSync(`schtasks /Query /TN "${TASK_NAME}" /FO LIST /V`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (!output.trim()) {
      return { exists: false };
    }
    
    // Parse output for details
    const lines = output.split('\n');
    let nextRun = 'Unknown';
    let schedule = 'Unknown';
    
    for (let line of lines) {
      line = line.trim();
      const runMatch = line.match(/^Next Run Time:\s+(.*)/);
      if (runMatch) nextRun = runMatch[1].trim();

      const typeMatch = line.match(/^Schedule Type:\s+(.*)/);
      if (typeMatch) schedule = typeMatch[1].trim();
    }
    
    return { exists: true, schedule, nextRun };
  } catch (error) {
    return { exists: false };
  }
}

module.exports = {
  createScheduledTask,
  removeScheduledTask,
  getTaskStatus
};
