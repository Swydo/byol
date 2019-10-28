#!/usr/bin/env node

const yargs = require('yargs');
const startApiCommand = require('./commands/startApi.js');
const startLambdaCommand = require('./commands/startLambda');
const invokeCommand = require('./commands/invoke');

// eslint-disable-next-line no-unused-expressions
yargs
    .option('silent', {
        alias: 's',
        type: 'boolean',
        default: false,
    })
    .command(startApiCommand)
    .command(startLambdaCommand)
    .command(invokeCommand)
    .argv;
