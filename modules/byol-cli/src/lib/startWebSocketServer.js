const debug = require('debug')('byol:server:ws');
const WebSocket = require('ws');
const { invokeFunction } = require('@swydo/byol');
const { generateRequestId } = require('@swydo/byol');
const { getWebSocketMapping } = require('@swydo/byol');
const dateformat = require('dateformat');
const { createHttpServer } = require('./createHttpServer');

const EVENT_TYPE = {
    CONNECT: 'CONNECT',
    DISCONNECT: 'DISCONNECT',
    MESSAGE: 'MESSAGE',
};

function setupWebsocketEvents(wss, websocketConnections, routes, apiInfo, invokeOptions) {
    const connectRoute = routes.get('$connect');
    const defaultRoute = routes.get('$default');
    const disconnectRoute = routes.get('$disconnect');

    wss.on('connection', function (ws, request) {
        const params = {
            apiInfo,
            invokeOptions,
            ws,
            request,
            websocketConnections,
        };

        const connectionContext = onConnect({ route: connectRoute, ...params });
        onMessage({ route: defaultRoute, ...params }, connectionContext);
        onClose({ route: disconnectRoute, ...params }, connectionContext);
    });
}

function escapeRoute(route) {
    return route.split('$').join('\\$').split('@').join('\\@');
}

function setupHttpEvents(app, websocketConnections, apiInfo) {
    const setHeaders = (res) => {
        res.set('x-amzn-RequestId', generateRequestId());
        res.set('x-amz-apigw-id', apiInfo.apiId);
    };
    const wsNotFound = (res) => {
        setHeaders(res);
        res.set('x-amzn-ErrorType', 'GoneException');
        res.sendStatus(410);
    };

    app.get(escapeRoute(`/${apiInfo.stage}/@connections/:id`), function (req, res) {
        const id = req.params.id;
        if (websocketConnections.has(id)) {
            const { ws, context } = websocketConnections.get(id);
            setHeaders(res);
            res.send({
                "ConnectedAt": new Date(context.connectedAt).toISOString(),
                "Identity": {
                    "SourceIp": context.ip,
                },
                "LastActiveAt": new Date(context.lastActiveAt).toISOString(),
            });
        } else {
            wsNotFound(res);
        }
    });

    app.post(escapeRoute(`/${apiInfo.stage}/@connections/:id`), function (req, res) {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            const id = req.params.id;
            if (websocketConnections.has(id)) {
                const { ws, context } = websocketConnections.get(id);
                ws.send(body);
                setHeaders(res);
                res.sendStatus(200);
            } else {
                wsNotFound(res);
            }
        });

    });
    
    app.delete(escapeRoute(`/${apiInfo.stage}/@connections/:id`), function (req, res) {
        const id = req.params.id;
        if (websocketConnections.has(id)) {
            const { ws, context } = websocketConnections.get(id);
            ws.close();
            setHeaders(res);
            res.sendStatus(204);
        } else {
            wsNotFound(res);
        }
    });
}

function startWebSocketServer({
    environmentOptions: {
        port = 3000,
    } = {},
    invokeOptions,
}) {
    const { app, server } = createHttpServer(port);

    const apiMap = getWebSocketMapping(invokeOptions.templatePath);
    printConfiguration(apiMap);

    for (const [apiKey, api] of apiMap.entries()) {
        const apiInfo = {
            apiId: apiKey,
            stage: api.stage?.Properties?.StageName,
        };
        const wss = new WebSocket.Server({ server, path: `/${apiInfo.stage}` });
        const websocketConnections = new Map();

        setupWebsocketEvents(wss, websocketConnections, api.routes, apiInfo, invokeOptions);
        setupHttpEvents(app, websocketConnections, apiInfo, invokeOptions);
    }
}


function onConnect({
    route,
    apiInfo,
    invokeOptions,
    ws,
    request,
    websocketConnections,
}) {
    const connectionContext = {
        connectionId: generateRequestId(),
        connectedAt: new Date().getTime(),
        lastActiveAt: new Date().getTime(),
        ip: request.socket.remoteAddress,
    };
    websocketConnections.set(connectionContext.connectionId, {
        ws,
        context: connectionContext,
    });

    if (route) {
        const headers = {
            "Host": request.headers.host,
            "Sec-WebSocket-Extensions": request.headers['sec-websocket-extensions'],
            "Sec-WebSocket-Key": request.headers['sec-websocket-key'],
            "Sec-WebSocket-Version": request.headers['sec-websocket-version'],
            "X-Amzn-Trace-Id": "Root=1-6107c109-306f421006007da9658753b3",
            "X-Forwarded-For": request.socket.remoteAddress,
            "X-Forwarded-Port": "443",
            "X-Forwarded-Proto": "https",
        };
        const event = getLambdaEvent(headers, route, connectionContext, apiInfo, EVENT_TYPE.CONNECT);
        logInvoke(route, connectionContext);
        invokeFunction(route.lambdaName, event, invokeOptions)
            .then(result => {
                const statusCode = result.result.statusCode ?? 500;
                if (statusCode < 200 || 400 <= statusCode) {
                    terminateConnection(ws, connectionContext, websocketConnections);
                }
            })
            .catch((err) => {
                terminateConnection(ws, connectionContext, websocketConnections);
            });

        return connectionContext;
    } else {
        terminateConnection(ws, connectionContext, websocketConnections);
    }
}


function onMessage({
    route,
    apiInfo,
    invokeOptions,
    ws,
    request,
    websocketConnections,
}, connectionContext) {
    ws.on('message', (message) => {
        connectionContext.lastActiveAt = new Date().getTime();

        const event = {
            requestContext: getRequestContext(route, connectionContext, apiInfo, EVENT_TYPE.MESSAGE),
            body: message,
            isBase64Encoded: false,
        };

        logInvoke(route, connectionContext);
        invokeFunction(route.lambdaName, event, invokeOptions)
            .then(result => {
                ws.send(JSON.stringify(result.result.body));
            })
            .catch((err) => {
                terminateConnection(ws, connectionContext, websocketConnections);
            });
    });
}

function onClose({
    route,
    apiInfo,
    invokeOptions,
    ws,
    request,
    websocketConnections,
}, connectionContext) {
    ws.on('close', function () {
        if (route) {
            const headers = {
                "Host": request.headers.host,
                "x-api-key": "",
                "X-Forwarded-For": "",
                "x-restapi": "",
            };
            const event = getLambdaEvent(headers, route, connectionContext, apiInfo, EVENT_TYPE.DISCONNECT);
            logInvoke(route, connectionContext);
            invokeFunction(route.lambdaName, event, invokeOptions)
                .catch((err) => {
                    terminateConnection(ws, connectionContext, websocketConnections);
                });
        }
        terminateConnection(ws, connectionContext, websocketConnections);

    });
}

function terminateConnection(ws, connectionContext, websocketConnections) {
    debug(`Terminated connection ${connectionContext.connectionId}`);
    ws.terminate();

    if (websocketConnections.has(connectionContext.connectionId)) {
        websocketConnections.delete(connectionContext.connectionId);
    }
}

function logInvoke(routeConfig, connectionContext) {
    const route = routeConfig?.route?.Properties?.RouteKey;
    debug(`Invoke ${route} by: ${connectionContext.connectionId}`);
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
    return Object.keys(headers).reduce(((previousValue, currentValue) => ({ [currentValue]: [headers[currentValue]], ...previousValue })), {});
}

function printConfiguration(apiMap) {
    for (const [apiKey, api] of apiMap.entries()) {
        debug(`Registering api: ${apiKey} with stage ${api.stage?.Properties?.StageName}`);
        for (const [key, route] of api.routes.entries()) {
            debug(`Registered route: ${key} with lambda ${route.lambdaName}`);
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
