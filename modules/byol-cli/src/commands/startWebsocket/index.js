const path = require('path');
const { startServer } = require('../../lib/startServer');
const { handleGlobalOptions } = require('../../handleGlobalOptions');

const command = ['start-websocket'];
const desc = 'Start a local websocket server';
const builder = (yargs) => yargs
    .option('env-path', {
        alias: ['env-vars', 'n'],
        default: './env.json',
    })
    .option('keep-alive')
    .option('port', {
        alias: 'p',
        default: 3000,
    })
    .option('profile', {
        default: 'default',
    })
    .option('region')
    .option('template-path', {
        alias: ['template-file', 'template', 't'],
        default: './template.yml',
    });
const handler = async ({
    envPath,
    keepAlive,
    port,
    profile,
    region,
    templatePath,
    ...globalOptions
}) => {
    handleGlobalOptions(globalOptions);

    startServer({
        environmentOptions: {
            port,
        },
        invokeOptions: {
            keepAlive,
            profile,
            region,
            debugPortStart: port + 1,
            envPath: path.resolve(process.cwd(), envPath),
            templatePath: path.resolve(process.cwd(), templatePath),
        },
        webSocket: true,
    });
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
