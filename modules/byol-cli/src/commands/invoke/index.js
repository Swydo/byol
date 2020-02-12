const { invokeFunction } = require('@swydo/byol');
const { handleGlobalOptions } = require('../../handleGlobalOptions');

const command = 'invoke';
const desc = 'Invoke a lambda function';
const builder = (yargs) => yargs
    .option('functionName', {
        alias: 'f',
    })
    .option('event', {
        alias: 'e',
    });
const handler = async ({ functionName, event, ...globalOptions }) => {
    handleGlobalOptions(globalOptions);

    try {
        const result = await invokeFunction(functionName, JSON.parse(event));

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
