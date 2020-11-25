const { startSqsServer } = require('./startSqsServer');
const { startHttpServer } = require('./startHttpServer');

async function startServer({
    lambda,
    api,
    sqs,
    environmentOptions: {
        templateOverrides,
        port,
        sqsEndpointUrl,
    } = {},
    invokeOptions,
}) {
    if (lambda || api) {
        await startHttpServer({
            lambda,
            api,
            environmentOptions: {
                port,
            },
            invokeOptions,
        });
    }

    if (sqs) {
        await startSqsServer({
            environmentOptions: {
                templateOverrides,
                sqsEndpointUrl,
            },
            invokeOptions,
        });
    }
}

module.exports = {
    startServer,
};
