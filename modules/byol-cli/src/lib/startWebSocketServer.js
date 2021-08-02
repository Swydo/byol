
const WebSocket = require('ws');
const { invokeFunction } = require('@swydo/byol');
const { generateRequestId } = require('@swydo/byol');
const { getWebSocketMapping } = require('@swydo/byol');



async function startWebSocketServer({
    webSocket,
    environmentOptions: {
        port = 3000,
    } = {},
    invokeOptions,
}) {
    const wss = new WebSocket.Server({
        port: 11001,
        clientTracking: true,
    });
    const connections = new Map();


    const { routeSelectionExpression, routes } = getWebSocketMapping(invokeOptions.templatePath);
    const onConnect = routes.has('$connect') ? invokeRouteFunction(routes.get('$connect'), invokeOptions) : () => {}
    const onDisconnect = routes.has('$disconnect') ? invokeRouteFunction(routes.get('$disconnect'), invokeOptions) : () => {}


    wss.on('connection', function (ws, request) {
        const connectionId = generateRequestId();
        connections.set(connectionId, ws);
        onConnect(ws);


        ws.on('message', onMessage(routes, routeSelectionExpression, ws, invokeOptions, connectionId));

        ws.on('close', function () {
            onDisconnect(ws);
            connections.delete(id);
        });
    });
}

function invokeRouteFunction(route, invokeOptions) {
    return (ws) => {
        const functionName = route.lambdaName

        invokeFunction(functionName, { }, invokeOptions)
            .catch((err) => {
                console.log(err);
                ws.close(1006, JSON.stringify(err));
            });
    }
}

function onMessage(routes, routeSelectionExpression, ws, invokeOptions, connectionId) {
    const routeSelector = buildRouteSelector(routeSelectionExpression);
    const defaultRoute = routes.get('$default');
    return (message) => {
        const selectedRoute = routeSelector(message);
        let route = defaultRoute;
        if(routes.has(selectedRoute)) {
            route = routes.get(selectedRoute);
        }

        invokeFunction(route.lambdaName, { requestContext: {connectionId} }, invokeOptions)
            .then(result => {
                ws.send(JSON.stringify(result.result.body));
            })
            .catch((err) => {
                console.log(err);
                ws.close(1006, JSON.stringify(err));
            });
    }
}

function buildRouteSelector(routeSelectionExpression) {
    return (message) => {
        return '$default';
    }
}


module.exports = {
    startWebSocketServer,
}
