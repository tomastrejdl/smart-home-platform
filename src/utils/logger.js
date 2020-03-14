const chalk = require('chalk');

const Logger = topic => ({
  log: (...message) =>
    console.log(chalk.black.bgGreen(`  ${topic}  `) + ' ', ...message),
  warn: (...message) =>
    console.log(chalk.black.bgYellow(`  ${topic}  `) + ' ', ...message),
  err: (...message) =>
    console.log(chalk.black.bgRed(`  ${topic}  `) + ' ', ...message),
});

module.exports = Logger;
