const { invokeFunction } = require('@swydo/byol');
const { handleGlobalOptions } = require('../../handleGlobalOptions');

const command = 'invoke';
const desc = 'Invoke a lambda function';
const builder = (yargs) => yargs
    .option('env-path', {
        alias: ['env-vars', 'n'],
        default: './env.json',
    })
    .option('event', {
        alias: 'e',
    })
    .option('functionName', {
        alias: 'f',
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
    event,
    functionName,
    profile,
    templatePath,
    ...globalOptions
}) => {
    handleGlobalOptions(globalOptions);

    try {
        const result = await invokeFunction(functionName, JSON.parse(event), { templatePath, envPath, profile });

        console.log(result); // eslint-disable-line no-console
    } catch (e) {
        console.error(e); // eslint-disable-line no-console
    }
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
