const { generateRequestId, invokeFunction } = require('@swydo/byol');
const cors = require('cors');
const debug = require('debug')('byol:server:http');
const express = require('express');
const { getApiMapping } = require('@swydo/byol');

function parseQueryParams(parsedUrl) {
    const queryStringParameters = {};
    const multiValueQueryStringParameters = {};

    parsedUrl.searchParams.forEach((value, key) => {
        queryStringParameters[key] = value;
        multiValueQueryStringParameters[key] = [
            ...multiValueQueryStringParameters[key] || [],
            value,
        ];
    });

    return { queryStringParameters, multiValueQueryStringParameters };
}

function parseHeaders(rawHeaders) {
    const headers = {};
    const multiValueHeaders = {};

    rawHeaders
        .reduce((sets, currentValue, index) => {
            if (index % 2) {
                const setIndex = Math.floor(index / 2);
                sets[setIndex].push(currentValue);
            } else {
                sets.push([currentValue]);
            }

            return sets;
        }, [])
        .forEach(([key, value]) => {
            headers[key] = value;
            multiValueHeaders[key] = [
                ...multiValueHeaders[key] || [],
                value,
            ];
        });

    return { headers, multiValueHeaders };
}

function attachLambdaServer(app, { invokeOptions }) {
    const path = '/2015-03-31/functions/:functionName/invocations';

    debug('AWS API at http post', path);

    app.post(path, (req, res) => {
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
    const mapping = getApiMapping(invokeOptions.templatePath);

    function routeHandler(matchingMapping, req, res) {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            const parsedUrl = new URL(req.url, 'http://localhost');
            const requestId = generateRequestId();
            const pathParameters = matchingMapping.listener.match(parsedUrl.pathname);
            const { headers, multiValueHeaders } = parseHeaders(req.rawHeaders);
            const { queryStringParameters, multiValueQueryStringParameters } = parseQueryParams(parsedUrl);
            const requestContext = {
                resourcePath: matchingMapping.listener.resource,
                httpMethod: req.method,
                identity: {
                    sourceIp: req.ip,
                },
                requestId,
            };

            const event = {
                resource: matchingMapping.listener.resource,
                httpPath: parsedUrl.pathname,
                httpMethod: req.method,
                headers,
                multiValueHeaders,
                pathParameters,
                queryStringParameters,
                multiValueQueryStringParameters,
                requestContext,
                body,
            };

            invokeFunction(matchingMapping.functionName, event, invokeOptions)
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
    }

    mapping.forEach((currentMapping) => {
        const { functionName, listener } = currentMapping;
        const method = listener.httpMethod.toLowerCase();

        debug(functionName, 'at http', method, listener.route);

        app[method](listener.route, (req, res) => routeHandler(currentMapping, req, res));
    });
}

async function startHttpServer({
    lambda,
    api,
    environmentOptions: {
        port = 3000,
    } = {},
    invokeOptions,
}) {
    const app = express();

    app.use(cors());

    if (lambda) {
        attachLambdaServer(app, { invokeOptions });
    }

    if (api) {
        attachApiServer(app, { invokeOptions });
    }

    app.set('trust proxy', true);
    app.listen(port);

    debug('Listening on port', port);
}

module.exports = {
    startHttpServer,
};