const { handleGlobalOptions } = require('../../handleGlobalOptions');
const { startLambdaServer } = require('./startLambdaServer');

const command = ['start', 'start-lambda'];
const desc = 'Start a local lambda server';
const builder = (yargs) => yargs
    .option('port', {
        alias: 'p',
        default: 3000,
    })
    .option('keep-alive');
const handler = async ({ port, keepAlive, ...globalOptions }) => {
    handleGlobalOptions(globalOptions);

    startLambdaServer(port, { keepAlive });
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
