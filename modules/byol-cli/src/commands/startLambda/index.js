const { startLambdaServer } = require('./startLambdaServer');

const command = ['start', 'start-lambda'];
const desc = 'Start a local lambda server';
const builder = yargs =>
    yargs.option('port', {
        alias: 'p',
        default: 3000,
    });
const handler = async ({ port }) => {
    startLambdaServer(port);
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
