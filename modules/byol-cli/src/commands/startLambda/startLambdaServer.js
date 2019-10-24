const express = require('express');
const { invokeFunction } = require('@swydo/byol');
const debug = require('debug')('byol:server');

const app = express();

app.post('/2015-03-31/functions/:functionName/invocations', (req, res) => {
    const { functionName } = req.params;

    let eventString = '';

    req.on('data', (chunk) => {
        eventString += chunk;
    });

    req.on('end', () => {
        const event = eventString ? JSON.parse(eventString) : {};

        invokeFunction(functionName, event)
            .then((result) => {
                res.send(result);
            })
            .catch((err) => {
                res.status(500);
                res.send(err);
                res.end();
            });
    });
});

function startLambdaServer(port) {
    app.listen(port);

    debug('Listening on port', port);
}

module.exports = {
    startLambdaServer,
};
