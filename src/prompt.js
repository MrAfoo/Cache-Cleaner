'use strict';

const inquirer = require('inquirer');

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
