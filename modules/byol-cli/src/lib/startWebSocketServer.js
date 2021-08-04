const debug = require('debug')('byol:server:ws');
const WebSocket = require('ws');
const { invokeFunction } = require('@swydo/byol');
const { generateRequestId } = require('@swydo/byol');
const { getWebSocketMapping } = require('@swydo/byol');
const dateformat = require('dateformat');

const EVENTTYPE = {
    CONNECT: 'CONNECT',
    DISCONNECT: 'DISCONNECT',
    MESSAGE: 'MESSAGE',
}

async function startWebSocketServer({
    express,
    environmentOptions: {
        port = 3000,
    } = {},
    invokeOptions,
}) {
    port = port + 1;
    debug(`Listening on port: ${port}`);


    const connections = new Map();
    const apiMap = getWebSocketMapping(invokeOptions.templatePath);
    printConfiguration(apiMap);


    for (const [apiKey, api] of apiMap.entries()) {
        // Todo: in the future if we want to support multiple stages
        const wss = new WebSocket.Server({
            port,
            clientTracking: true,
            path: '/$default'
        });


        const routes = api.routes;
        const defaultRoute = api.routes.get('$default');
        const apiInfo = {
            apiId: apiKey,
        };

        wss.on('connection', function (ws, request) {
            const connectionContext = {
                connectionId: generateRequestId(),
                connectedAt: new Date().getTime(),
                ip: request.socket.remoteAddress,
            };
            connections.set(connectionContext.connectionId, ws);
            onConnect(routes.get('$connect'), apiInfo, invokeOptions, ws, request, connectionContext);


            ws.on('message', (message) => {
                const event = {
                    requestContext: getRequestContext(defaultRoute, connectionContext, apiInfo, EVENTTYPE.MESSAGE),
                    body: message,
                    isBase64Encoded: false,
                };

                const functionName = defaultRoute.lambdaName;
                debug(`Invoke route '$default' with lambda ${functionName} at ws`);
                invokeFunction(defaultRoute.lambdaName, event, invokeOptions)
                    .then(result => {
                        ws.send(JSON.stringify(result.result.body));
                    })
                    .catch((err) => {
                        debug('error when handling message', err);
                        ws.close(1006, JSON.stringify(err));
                    });
            });

            ws.on('close', function () {
                try {
                    onDisconnect(routes.get('$disconnect'), apiInfo, invokeOptions, ws, request, connectionContext);
                    connections.delete(connectionContext.connectionId);
                } catch (e) {
                    debug(e);
                }
            });
        });
    }
}

function getLambdaEvent(headers, routeConfig, connectionContext, apiInfo, eventType) {
    const event = {
        "headers": headers,
        "multiValueHeaders": headersToMultiValueHeaders(headers),
        "requestContext": getRequestContext(routeConfig, connectionContext, apiInfo, eventType),
        "isBase64Encoded": false,
    };
    return event;
}

function onConnect(routeConfig, apiInfo, invokeOptions, ws, request, connectionContext) {
    if (routeConfig) {
        const headers =  {
            "Host": request.headers.host,
            "Sec-WebSocket-Extensions": request.headers['sec-websocket-extensions'],
            "Sec-WebSocket-Key": request.headers['sec-websocket-key'],
            "Sec-WebSocket-Version": request.headers['sec-websocket-version'],
            "X-Amzn-Trace-Id": "Root=1-6107c109-306f421006007da9658753b3",
            "X-Forwarded-For": request.socket.remoteAddress,
            "X-Forwarded-Port": "443",
            "X-Forwarded-Proto": "https",
        };
        const event = getLambdaEvent(headers, routeConfig, connectionContext, apiInfo, EVENTTYPE.CONNECT);
        debug(routeConfig.lambdaName, 'at ws', routeConfig.route.Properties.routeKey);
        invokeFunction(routeConfig.lambdaName, event, invokeOptions)
            .then(result => {
                const responseCode = result.result.responseCode ?? 500;

                if (responseCode < 200  || 400 <= responseCode) {
                    ws.terminate();
                }
            })
            .catch((err) => {
                terminateConnection(ws, connectionContext)
            });
    } else {
        terminateConnection(ws, connectionContext)
    }
}

function terminateConnection(ws, connectionContext) {
    debug(`Terminated connection ${connectionContext.connectionId}`);
    ws.terminate();
}

function onDisconnect(routeConfig, apiInfo, invokeOptions, ws, request, connectionContext) {
    if (routeConfig) {
        const headers =  {
            "Host": request.headers.host,
            "x-api-key": "",
            "X-Forwarded-For": "",
            "x-restapi": "",
        };
        const event = getLambdaEvent(headers, routeConfig, connectionContext, apiInfo, EVENTTYPE.DISCONNECT);
        debug(routeConfig.lambdaName, 'at ws', routeConfig.route.Properties.routeKey);
        invokeFunction(routeConfig.lambdaName, event, invokeOptions)
            .catch((err) => {
                terminateConnection(ws, connectionContext);
            });
    } else {
        ws.close();
    }
}

function getRequestContext(routeConfig, connectionContext, apiInfo, eventType) {
    const requestId = generateRequestId();
    return {
        "routeKey": routeConfig.route.routeKey,
        "disconnectStatusCode": -1,
        "eventType": eventType,
        "extendedRequestId": requestId,
        "requestTime": getFormattedDate(new Date()),
        "messageDirection": "IN",
        "disconnectReason": "",
        "stage": "$default",
        "connectedAt": connectionContext.connectedAt,
        "requestTimeEpoch": new Date().getTime(),
        "identity": {
            "sourceIp": connectionContext.ip,
        },
        "requestId": requestId,
        "domainName": "localhost",
        "connectionId": connectionContext.connectionId,
        "apiId": apiInfo.apiId,
    };
}

function headersToMultiValueHeaders(headers) {
    return Object.keys(headers).reduce(((previousValue, currentValue) => ({[currentValue]: [headers[currentValue]], ...previousValue})), {});
}

function printConfiguration(apiMap) {
    for (const [apiKey, api] of apiMap.entries()) {
        debug(`Registering api: ${apiKey}`);
        for (const [key, route] of api.routes.entries()) {
            debug(`Route: ${key} with lambda ${route.lambdaName}`);
        }
    }
}

function getFormattedDate(date) {
    //format as such 02/Aug/2021:09:55:21 +0000
    dateformat(date, 'UTC:dd/mmm/yyyy:hh:MM:ss +0000');
}

module.exports = {
    startWebSocketServer,
};
