const { generateRequestId } = require('@swydo/byol');
const debug = require('debug')('byol:ws');
const { createHttpServer } = require('./createHttpServer');
const { logHttpRouteRegistration } = require('./logging');

function escapeRoute(route) {
    return route.split('$').join('\\$').split('@').join('\\@');
}

function logRegisteredHTTPRoute(verb, route) {
    logHttpRouteRegistration(debug, verb, route);
}

function registerWebSocketAPI(websocketConnections, apiInfo, { port = 3000 }) {
    const { app } = createHttpServer(debug, port);
    const setHeaders = (res) => {
        res.set('x-amzn-RequestId', generateRequestId());
        res.set('x-amz-apigw-id', apiInfo.apiId);
        res.set('X-Amzn-Trace-Id', 'Root=1-6107c109-306f421006007da9658753b3');
        res.set('Content-type', 'application/json');
    };
    const wsNotFound = (res) => {
        setHeaders(res);
        res.set('x-amzn-ErrorType', 'GoneException');
        res.status(410).end();
    };
    const getRoute = escapeRoute(`/${apiInfo.stage}/@connections/:id`);
    logRegisteredHTTPRoute('GET', getRoute);
    app.get(getRoute, (req, res) => {
        const { id } = req.params;
        if (websocketConnections.has(id)) {
            const { context } = websocketConnections.get(id);
            setHeaders(res);
            res
                .status(200)
                .send({
                    ConnectedAt: new Date(context.connectedAt).toISOString(),
                    Identity: {
                        SourceIp: context.ip,
                    },
                    LastActiveAt: new Date(context.lastActiveAt).toISOString(),
                })
                .end();
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
                res.status(200).end();
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
            res.status(204).end();
        } else {
            wsNotFound(res);
        }
    });
}

module.exports = {
    registerWebSocketAPI,
};
