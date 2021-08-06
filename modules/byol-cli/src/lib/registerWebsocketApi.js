const { generateRequestId } = require('@swydo/byol');
const debug = require('debug')('byol:server:ws');
const { createHttpServer } = require('./createHttpServer');

function escapeRoute(route) {
    return route.split('$').join('\\$').split('@').join('\\@');
}

function logRegisteredHTTPRoute(verb, route) {
    const unescapeRoute = route.split('/\\').join('/');
    debug(`Registered HTTP route: ${verb} ${unescapeRoute}`);
}

function registerWebSocketAPI(websocketConnections, apiInfo, { port = 3000 }) {
    const { app } = createHttpServer(debug, port);
    const setHeaders = (res) => {
        res.set('x-amzn-RequestId', generateRequestId());
        res.set('x-amz-apigw-id', apiInfo.apiId);
    };
    const wsNotFound = (res) => {
        setHeaders(res);
        res.set('x-amzn-ErrorType', 'GoneException');
        res.sendStatus(410);
    };
    const getRoute = escapeRoute(`/${apiInfo.stage}/@connections/:id`);
    logRegisteredHTTPRoute('GET', getRoute);
    app.get(getRoute, (req, res) => {
        const { id } = req.params;
        if (websocketConnections.has(id)) {
            const { context } = websocketConnections.get(id);
            setHeaders(res);
            res.send({
                ConnectedAt: new Date(context.connectedAt).toISOString(),
                Identity: {
                    SourceIp: context.ip,
                },
                LastActiveAt: new Date(context.lastActiveAt).toISOString(),
            });
        } else {
            wsNotFound(res);
        }
    });
    const postRoute = escapeRoute(`/${apiInfo.stage}/@connections/:id`);
    logRegisteredHTTPRoute('POST', postRoute);
    app.post(postRoute, (req, res) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            const { id } = req.params;
            if (websocketConnections.has(id)) {
                const { ws } = websocketConnections.get(id);
                ws.send(body);
                setHeaders(res);
                res.sendStatus(200);
            } else {
                wsNotFound(res);
            }
        });
    });

    const deleteRoute = escapeRoute(`/${apiInfo.stage}/@connections/:id`);
    logRegisteredHTTPRoute('DELETE', deleteRoute);
    app.delete(deleteRoute, (req, res) => {
        const { id } = req.params;
        if (websocketConnections.has(id)) {
            const { ws } = websocketConnections.get(id);
            ws.close();
            setHeaders(res);
            res.sendStatus(204);
        } else {
            wsNotFound(res);
        }
    });
}

module.exports = {
    registerWebSocketAPI,
};
