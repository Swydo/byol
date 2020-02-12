const { handleGlobalOptions } = require('../../handleGlobalOptions');
const { startApiServer } = require('./startApiServer');

const command = ['start-api'];
const desc = 'Start a local api server';
const builder = (yargs) => yargs.option('port', {
    alias: 'p',
    default: 3000,
});
const handler = async ({ port, ...globalOptions }) => {
    handleGlobalOptions(globalOptions);

    startApiServer(port);
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
