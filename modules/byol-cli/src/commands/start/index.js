const path = require('path');
const { startServer } = require('../../lib/startServer');
const { handleGlobalOptions } = require('../../handleGlobalOptions');

const command = ['*', 'start'];
const desc = 'Start a local lambda and API server';
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
    .option('template-path', {
        alias: ['template-file', 'template', 't'],
        default: './template.yml',
    });
const handler = async ({
    envPath,
    keepAlive,
    port,
    profile,
    templatePath,
    ...globalOptions
}) => {
    handleGlobalOptions(globalOptions);

    startServer({
        port,
        invokeOptions: {
            keepAlive,
            profile,
            envPath: path.resolve(process.cwd(), envPath),
            templatePath: path.resolve(process.cwd(), templatePath),
        },
        api: true,
        lambda: true,
    });
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
