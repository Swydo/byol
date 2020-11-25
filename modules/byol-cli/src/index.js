#!/usr/bin/env node

const yargs = require('yargs');
const startCommand = require('./commands/start');
const startApiCommand = require('./commands/startApi.js');
const startLambdaCommand = require('./commands/startLambda');
const startSqsCommand = require('./commands/startSqs');
const invokeCommand = require('./commands/invoke');

// eslint-disable-next-line no-unused-expressions
yargs
    .option('silent', {
        alias: 's',
        type: 'boolean',
        default: false,
    })
    .command(startCommand)
    .command(startApiCommand)
    .command(startLambdaCommand)
    .command(startSqsCommand)
    .command(invokeCommand)
    .argv;
