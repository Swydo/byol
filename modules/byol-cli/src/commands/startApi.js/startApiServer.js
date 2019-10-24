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
        const httpMethod = req.method;
        const path = req.url;

        invokeApi(httpMethod, path, body)
            .then((result) => {
                res.send(result);
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
