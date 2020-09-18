const { invokeApi, invokeFunction } = require('@swydo/byol');
const cors = require('cors');
const debug = require('debug')('byol:server');
const express = require('express');

function attachLambdaServer(app, { invokeOptions }) {
    app.post('/2015-03-31/functions/:functionName/invocations', (req, res) => {
        const { functionName } = req.params;

        let eventString = '';

        req.on('data', (chunk) => {
            eventString += chunk;
        });

        req.on('end', () => {
            const event = eventString ? JSON.parse(eventString) : {};

            invokeFunction(functionName, event, invokeOptions)
                .then(({ result, invocationType }) => {
                    res.status(invocationType === 'Event' ? 202 : 200);
                    res.send(result);
                })
                .catch(() => {
                    res.status(500);
                    res.end();
                });
        });
    });
}

function attachApiServer(app, { invokeOptions }) {
    app.all('*', cors(), (req, res) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            invokeApi({ ...req, body }, invokeOptions)
                .then((invokeResult) => {
                    const { result } = invokeResult;
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

                    res.status(result.statusCode || result.StatusCode);
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
                .catch((e) => {
                    let statusCode;

                    if (e.handlerError) {
                        statusCode = 502;
                    } else {
                        statusCode = 500;
                        // eslint-disable-next-line no-console
                        console.error(e);
                    }


                    res.status(statusCode);
                    res.end();
                });
        });
    });
}

function startServer({
    lambda,
    api,
    port,
    invokeOptions,
}) {
    const app = express();

    if (lambda) {
        attachLambdaServer(app, { invokeOptions });
    }

    if (api) {
        attachApiServer(app, { invokeOptions });
    }

    app.listen(port);

    debug('Listening on port', port);
}

module.exports = {
    startServer,
};
