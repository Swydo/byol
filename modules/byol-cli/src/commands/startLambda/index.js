const { startLambdaServer } = require('./startLambdaServer');
const { handleGlobalOptions } = require('../../handleGlobalOptions');

const command = ['start', 'start-lambda'];
const desc = 'Start a local lambda server';
const builder = yargs =>
    yargs.option('port', {
        alias: 'p',
        default: 3000,
    });
const handler = async ({ port, ...globalOptions }) => {
    handleGlobalOptions(globalOptions);

    startLambdaServer(port);
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
