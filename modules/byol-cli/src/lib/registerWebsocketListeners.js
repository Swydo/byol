const { invokeFunction } = require('@swydo/byol');
const { generateRequestId } = require('@swydo/byol');
const dateformat = require('dateformat');
const debug = require('debug')('byol:ws');
const verbose = require('debug')('verbose:byol:ws');
const { URL } = require('url');

const EVENT_TYPE = {
    CONNECT: 'CONNECT',
    DISCONNECT: 'DISCONNECT',
    MESSAGE: 'MESSAGE',
};

function getFormattedDate(date) {
    // format as such 02/Aug/2021:09:55:21 +0000
    dateformat(date, 'UTC:dd/mmm/yyyy:hh:MM:ss +0000');
}

function getRequestContext(routeConfig, connectionContext, apiInfo, eventType) {
    const requestId = generateRequestId();
    return {
        routeKey: routeConfig.route.routeKey,
        disconnectStatusCode: -1,
        eventType,
        extendedRequestId: requestId,
        requestTime: getFormattedDate(new Date()),
        messageDirection: 'IN',
        disconnectReason: '',
        stage: '$default',
        connectedAt: connectionContext.connectedAt,
        requestTimeEpoch: new Date().getTime(),
        identity: {
            sourceIp: connectionContext.ip,
        },
        requestId,
        domainName: 'localhost',
        connectionId: connectionContext.connectionId,
        apiId: apiInfo.apiId,
    };
}

function headersToMultiValueHeaders(headers) {
    return Object.keys(headers)
        // disable is needed because eslint otherwise wants it on 1 line which is too long....
        // eslint-disable-next-line arrow-body-style
        .reduce((previousValue, currentValue) => {
            return ({ [currentValue]: [headers[currentValue]], ...previousValue });
        }, {});
}

function getQueryStringParameters(request) {
    if (!request) return {};

    const parsedURL = new URL(`https://localhost${request.url}`);

    const queryStringParameters = Array.from(parsedURL.searchParams.entries())
        .reduce((obj, [key, value]) => ({
            ...obj,
            [key]: value,
        }), {});
    const multiValueQueryStringParameters = Array.from(parsedURL.searchParams.keys())
        .reduce((obj, key) => ({
            ...obj,
            [key]: parsedURL.searchParams.getAll(key),
        }), {});

    return {
        queryStringParameters,
        multiValueQueryStringParameters,
    };
}

function getLambdaEvent(headers, routeConfig, connectionContext, apiInfo, eventType, request) {
    const event = {
        headers,
        multiValueHeaders: headersToMultiValueHeaders(headers),
        requestContext: getRequestContext(routeConfig, connectionContext, apiInfo, eventType),
        isBase64Encoded: false,
        ...getQueryStringParameters(request),
    };
    return event;
}

function terminateConnection(ws, connectionContext, websocketConnections) {
    verbose(`Terminated connection ${connectionContext.connectionId}`);
    ws.terminate();

    if (websocketConnections.has(connectionContext.connectionId)) {
        websocketConnections.delete(connectionContext.connectionId);
    }
}

function closeConnection(ws, connectionContext, websocketConnections, reason = '') {
    ws.close(1000, reason);

    if (websocketConnections.has(connectionContext.connectionId)) {
        websocketConnections.delete(connectionContext.connectionId);
    }
}

function logInvoke(routeConfig, connectionContext, message) {
    const route = routeConfig.route.Properties.RouteKey;
    if (message) {
        verbose(`Invoke ${route} by: ${connectionContext.connectionId} with message: %o`, message.toString());
    } else {
        verbose(`Invoke ${route} by: ${connectionContext.connectionId}`);
    }
}

function logUncaughtError(routeConfig, connectionContext, error) {
    const route = routeConfig.route.Properties.RouteKey;
    debug(`Invoke ${route} by: ${connectionContext.connectionId} failed with:`, error);
}

function logCaughtError(routeConfig, connectionContext, result) {
    const route = routeConfig.route.Properties.RouteKey;
    debug(`Invoke ${route} by: ${connectionContext.connectionId} failed with errorCode: ${result.statusCode}`, result);
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
    verbose('New connection with id:', connectionContext.connectionId);
    if (route) {
        const headers = {
            Host: request.headers.host,
            'Sec-WebSocket-Extensions': request.headers['sec-websocket-extensions'],
            'Sec-WebSocket-Key': request.headers['sec-websocket-key'],
            'Sec-WebSocket-Version': request.headers['sec-websocket-version'],
            'X-Amzn-Trace-Id': 'Root=1-6107c109-306f421006007da9658753b3',
            'X-Forwarded-For': request.socket.remoteAddress,
            'X-Forwarded-Port': '443',
            'X-Forwarded-Proto': 'https',
        };

        const event = getLambdaEvent(headers, route, connectionContext, apiInfo, EVENT_TYPE.CONNECT, request);

        logInvoke(route, connectionContext);
        invokeFunction(route.lambdaName, event, invokeOptions)
            .then((result) => {
                const statusCode = result.result.statusCode || 500;
                if (statusCode < 200 || statusCode >= 400) {
                    if (statusCode === 403) {
                        closeConnection(ws, connectionContext, websocketConnections, '403: not authenticated');
                    } else {
                        logCaughtError(route, connectionContext, result.result);
                        terminateConnection(ws, connectionContext, websocketConnections);
                    }
                } else {
                    verbose(`onConnect for ${connectionContext.connectionId} with result: %o`, result);
                }
            })
            .catch((err) => {
                logUncaughtError(route, connectionContext, err);
                terminateConnection(ws, connectionContext, websocketConnections);
            });

        return connectionContext;
    }
    terminateConnection(ws, connectionContext, websocketConnections);
    return undefined;
}

function onMessage({
    route,
    apiInfo,
    invokeOptions,
    ws,
    websocketConnections,
}, connectionContext) {
    ws.on('message', (message) => {
        const context = connectionContext;
        context.lastActiveAt = new Date().getTime();

        const event = {
            requestContext: getRequestContext(route, connectionContext, apiInfo, EVENT_TYPE.MESSAGE),
            body: message,
            isBase64Encoded: false,
        };

        logInvoke(route, connectionContext, message);
        invokeFunction(route.lambdaName, event, invokeOptions)
            .then((result) => {
                const statusCode = result.result.statusCode || 500;
                if (statusCode < 200 || statusCode >= 400) {
                    logCaughtError(ws, connectionContext, result.result);
                    terminateConnection(ws, connectionContext, websocketConnections);
                } else {
                    const routeKey = route.route.Properties.RouteKey;
                    verbose(`route: ${routeKey} for ${connectionContext.connectionId} with result: %o`, result);
                    ws.send(JSON.stringify(result.result.body));
                }
            })
            .catch((err) => {
                logUncaughtError(route, connectionContext, err);
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
    ws.on('close', () => {
        if (route) {
            const headers = {
                Host: request.headers.host,
                'x-api-key': '',
                'X-Forwarded-For': '',
                'x-restapi': '',
            };
            const event = getLambdaEvent(headers, route, connectionContext, apiInfo, EVENT_TYPE.DISCONNECT);
            logInvoke(route, connectionContext);
            invokeFunction(route.lambdaName, event, invokeOptions)
                .catch((err) => {
                    logUncaughtError(route, connectionContext, err);
                    terminateConnection(ws, connectionContext, websocketConnections);
                });
        }
        terminateConnection(ws, connectionContext, websocketConnections);
    });
}

function registerWebsocketEventListeners(wss, websocketConnections, routes, apiInfo, invokeOptions) {
    const connectRoute = routes.get('$connect');
    const defaultRoute = routes.get('$default');
    const disconnectRoute = routes.get('$disconnect');

    wss.on('connection', (ws, request) => {
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

module.exports = {
    registerWebsocketEventListeners,
};
