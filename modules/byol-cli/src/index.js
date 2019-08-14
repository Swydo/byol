#!/usr/bin/env node

const yargs = require('yargs');
const startLambdaCommand = require('./commands/startLambda');
const invokeCommand = require('./commands/invoke');

// eslint-disable-next-line no-unused-expressions
yargs
    .command(startLambdaCommand)
    .command(invokeCommand)
    .argv;
