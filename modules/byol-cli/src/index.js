const yargs = require('yargs');
const startCommand = require('./commands/start');
const invokeCommand = require('./commands/invoke');

// eslint-disable-next-line no-unused-expressions
yargs
    .command(startCommand)
    .command(invokeCommand)
    .argv;
