const { invokeFunction } = require('@swydo/byol');
const path = require('path');
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
    .option('region')
    .option('template-path', {
        alias: ['template-file', 'template', 't'],
        default: './template.yml',
    });
const handler = async ({
    envPath,
    event,
    functionName,
    profile,
    region,
    templatePath,
    ...globalOptions
}) => {
    handleGlobalOptions(globalOptions);

    try {
        const result = await invokeFunction(functionName, JSON.parse(event), {
            envPath: path.resolve(process.cwd(), envPath),
            templatePath: path.resolve(process.cwd(), templatePath),
            profile,
            region,
        });

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
