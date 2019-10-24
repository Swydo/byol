const express = require('express');
const { invokeApi } = require('@swydo/byol');
const debug = require('debug')('byol:server');

const app = express();

app.all('*', (req, res) => {
    let body = '';

    req.on('data', (chunk) => {
        body += chunk;
    });

    req.on('end', () => {
        invokeApi(req.method, req.url, req.rawHeaders, body)
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
                        headerValues.forEach(value => valuesSet.add(value));

                        multiValueHeadersMap.set(headerKey, valuesSet);
                    });
                }

                res.status(result.statusCode);
                multiValueHeadersMap.forEach((valuesSet, key) => res.set(key, Array.from(valuesSet)));
                res.send(result.body);
            })
            .catch(() => {
                res.status(500);
                res.end();
            });
    });
});

function startApiServer(port) {
    app.listen(port);

    debug('Listening on port', port);
}

module.exports = {
    startApiServer,
};
