const { startServer } = require('../../lib/startServer');
const { handleGlobalOptions } = require('../../handleGlobalOptions');

const command = ['start-api'];
const desc = 'Start a local api server';
const builder = (yargs) => yargs
    .option('port', {
        alias: 'p',
        default: 3000,
    })
    .option('keep-alive');
const handler = async ({ port, keepAlive, ...globalOptions }) => {
    handleGlobalOptions(globalOptions);

    startServer({
        port,
        keepAlive,
        api: true,
    });
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
