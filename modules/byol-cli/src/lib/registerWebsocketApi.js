const { generateRequestId } = require('@swydo/byol');
const { createHttpServer } = require('./createHttpServer');

function escapeRoute(route) {
    return route.split('$').join('\\$').split('@').join('\\@');
}

function registerWebSocketAPI(websocketConnections, apiInfo, { port = 3000 }) {
    const { app } = createHttpServer(port);
    const setHeaders = (res) => {
        res.set('x-amzn-RequestId', generateRequestId());
        res.set('x-amz-apigw-id', apiInfo.apiId);
    };
    const wsNotFound = (res) => {
        setHeaders(res);
        res.set('x-amzn-ErrorType', 'GoneException');
        res.sendStatus(410);
    };

    app.get(escapeRoute(`/${apiInfo.stage}/@connections/:id`), (req, res) => {
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

    app.post(escapeRoute(`/${apiInfo.stage}/@connections/:id`), (req, res) => {
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

    app.delete(escapeRoute(`/${apiInfo.stage}/@connections/:id`), (req, res) => {
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
