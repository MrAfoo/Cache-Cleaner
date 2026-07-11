'use strict';

const inquirer = require('inquirer');

/**
 * Shows a yes/no confirmation prompt to the user.
 *
 * @param {string} message - The question to display.
 * @returns {Promise<boolean>} true if user confirmed, false otherwise.
 */
async function confirmPrompt(message) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);

  return confirmed;
}

module.exports = { confirmPrompt };
