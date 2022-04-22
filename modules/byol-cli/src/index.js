#!/usr/bin/env node

const yargs = require('yargs');
const startCommand = require('./commands/start');
const startApiCommand = require('./commands/startApi.js');
const startLambdaCommand = require('./commands/startLambda');
const startSqsCommand = require('./commands/startSqs');
const startWebSocketCommand = require('./commands/startWebsocket');
const invokeCommand = require('./commands/invoke');

// eslint-disable-next-line no-unused-expressions
yargs
    .option('inspect', {
        type: 'boolean',
        default: false,
    })
    .option('silent', {
        alias: 's',
        type: 'boolean',
        default: false,
    })
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        default: false,
    })
    .command(startCommand)
    .command(startApiCommand)
    .command(startLambdaCommand)
    .command(startSqsCommand)
    .command(invokeCommand)
    .command(startWebSocketCommand)
    .argv;
