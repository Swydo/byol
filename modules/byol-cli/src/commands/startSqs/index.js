const path = require('path');
const { parseAttributeOption } = require('../../lib/parseAttributeOption');
const { startServer } = require('../../lib/startServer');
const { handleGlobalOptions } = require('../../handleGlobalOptions');

const command = ['start-sqs'];
const desc = 'Start a local sqs listener';
const builder = (yargs) => yargs
    .option('attribute', {
        alias: ['att'],
        type: 'string',
        description: 'Attribute override such as MyResource.Arn=foo',
    })
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
    .option('sqs-endpoint-url', {
        type: 'string',
        description: 'SQS endpoint',
        default: 'http://localhost:9324',
    })
    .option('template-path', {
        alias: ['template-file', 'template', 't'],
        default: './template.yml',
    });
const handler = async ({
    attribute,
    envPath,
    keepAlive,
    port,
    profile,
    region,
    sqsEndpointUrl,
    templatePath,
    ...globalOptions
}) => {
    handleGlobalOptions(globalOptions);

    startServer({
        environmentOptions: {
            port,
            sqsEndpointUrl,
            templateOverrides: {
                attributes: parseAttributeOption(attribute),
            },
        },
        invokeOptions: {
            keepAlive,
            profile,
            region,
            envPath: path.resolve(process.cwd(), envPath),
            templatePath: path.resolve(process.cwd(), templatePath),
        },
        sqs: true,
    });
};

module.exports = {
    command,
    desc,
    builder,
    handler,
};
