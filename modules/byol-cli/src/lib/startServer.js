const express = require('express');
const { invokeApi, invokeFunction } = require('@swydo/byol');
const debug = require('debug')('byol:server');

function attachLambdaServer(app, { keepAlive }) {
    app.post('/2015-03-31/functions/:functionName/invocations', (req, res) => {
        const { functionName } = req.params;

        let eventString = '';

        req.on('data', (chunk) => {
            eventString += chunk;
        });

        req.on('end', () => {
            const event = eventString ? JSON.parse(eventString) : {};

            invokeFunction(functionName, event, { keepAlive })
                .then((result) => {
                    res.send(result);
                })
                .catch(() => {
                    res.status(500);
                    res.end();
                });
        });
    });
}

function attachApiServer(app, { keepAlive }) {
    app.all('*', (req, res) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            invokeApi(req.method, req.url, req.rawHeaders, body, { keepAlive })
                .catch(() => {
                    // Intentionally left blank, ignore error and have then return a 502.
                })
                .then((result) => {
                    if (!result) {
                        res.status(502);
                        res.end();
                        return;
                    }

                    const multiValueHeadersMap = new Map();

                    if (result.headers) {
                        Object.keys(result.headers).forEach((headerKey) => {
                            const headerValue = result.headers[headerKey];

                            multiValueHeadersMap.set(headerKey, new Set([headerValue]));
                        });
                    }

                    if (result.multiValueHeaders) {
                        Object.keys(result.multiValueHeaders).forEach((headerKey) => {
                            const headerValues = result.multiValueHeaders[headerKey];

                            const valuesSet = multiValueHeadersMap.get(headerKey) || new Set();
                            headerValues.forEach((value) => valuesSet.add(value));

                            multiValueHeadersMap.set(headerKey, valuesSet);
                        });
                    }

                    res.status(result.statusCode);
                    multiValueHeadersMap.forEach((valuesSet, key) => {
                        const values = Array.from(valuesSet);

                        if (key.toLowerCase() === 'content-type') {
                            res.set(key, values[0]);
                        } else {
                            res.set(key, values);
                        }
                    });
                    res.send(result.body);
                })
                .catch(() => {
                    res.status(500);
                    res.end();
                });
        });
    });
}

function startServer({
    lambda,
    api,
    port,
    keepAlive,
}) {
    const app = express();

    if (lambda) {
        attachLambdaServer(app, { keepAlive });
    }

    if (api) {
        attachApiServer(app, { keepAlive });
    }

    app.listen(port);

    debug('Listening on port', port);
}

module.exports = {
    startServer,
};
