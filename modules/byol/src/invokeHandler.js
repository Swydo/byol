const { getWorkerPool, terminateWorkerPool } = require('./handlerWorkerPool');

async function invokeHandler({
    absoluteIndexPath,
    handlerName,
    environment,
    event,
    keepAlive = false,
}) {
    const workerPool = await getWorkerPool(handlerName, environment);

    try {
        return await workerPool.exec('callHandler', [{
            absoluteIndexPath,
            handlerName,
            event,
            environment: {
                ...process.env,
                ...environment,
            },
        }]);
    } finally {
        if (!keepAlive) {
            terminateWorkerPool(handlerName);
        }
    }
}

module.exports = {
    invokeHandler,
};
