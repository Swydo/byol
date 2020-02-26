const path = require('path');
const workerpool = require('workerpool');

const handlerWorkerPool = workerpool.pool(path.join(__dirname, 'assets', 'callHandlerProcess.js'));

module.exports = {
    handlerWorkerPool,
};
