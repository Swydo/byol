const debug = require('debug')('byol:server:ws');
const WebSocket = require('ws');
const { getWebSocketMapping } = require('@swydo/byol');
const { registerWebsocketEventListeners } = require('./registerWebsocketListeners');
const { createHttpServer } = require('./createHttpServer');
const { registerWebSocketAPI } = require('./registerWebsocketApi');

function printConfiguration(apiMap) {
    Array.from(apiMap.entries()).forEach(([apiKey, api]) => {
        debug(`Registering api: ${apiKey} with stage ${api.stage.Properties.StageName}`);
        Array.from(api.routes.entries()).forEach(([key, route]) => {
            debug(`Registered route: ${key} with lambda ${route.lambdaName}`);
        });
    });
}

function startWebSocketServer({
    environmentOptions: {
        port = 3000,
    } = {},
    invokeOptions,
}) {
    const { server } = createHttpServer(port);

    const apiMap = getWebSocketMapping(invokeOptions.templatePath);
    printConfiguration(apiMap);

    Array.from(apiMap.entries()).forEach(([apiKey, api]) => {
        const apiInfo = {
            apiId: apiKey,
            stage: api.stage.Properties.StageName,
        };
        const wss = new WebSocket.Server({ server, path: `/${apiInfo.stage}` });
        const websocketConnections = new Map();

        registerWebsocketEventListeners(wss, websocketConnections, api.routes, apiInfo, invokeOptions);
        registerWebSocketAPI(websocketConnections, apiInfo, { port });
    });
}

module.exports = {
    startWebSocketServer,
};
