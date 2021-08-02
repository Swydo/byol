const { startWebSocketServer } = require('./startWebSocketServer');
const { startSqsServer } = require('./startSqsServer');
const { startHttpServer } = require('./startHttpServer');

async function startServer({
    lambda,
    api,
    sqs,
    webSocket,
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

    if(webSocket) {
        await startWebSocketServer({
            webSocket,
            environmentOptions: {
                port,
            },
            invokeOptions
        })
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
