const { handlerWorkerPool } = require('./handlerWorkerPool');

async function invokeHandler({
    absoluteIndexPath,
    handlerName,
    environment,
    event,
}) {
    return handlerWorkerPool.exec('callHandler', [{
        absoluteIndexPath,
        handlerName,
        event,
        environment: {
            ...process.env,
            ...environment,
        },
    }]);
}

module.exports = {
    invokeHandler,
};
