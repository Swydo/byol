const express = require('express');
const cors = require('cors');

let server = {};

function createHttpServer(debug, port) {
    if (!server.app && !server.listen) {
        const app = express();
        app.use(cors());
        app.set('trust proxy', true);
        const listen = app.listen(port);
        debug('Listening on port', port);
        server = { app, server: listen };
    }

    return server;
}

module.exports = {
    createHttpServer,
};
