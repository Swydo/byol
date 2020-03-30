const { getWorkerPool, terminateWorkerPool } = require('./handlerWorkerPool');
const { generateRequestId } = require('./generateRequestId');

async function invokeHandler({
    absoluteIndexPath,
    handlerName,
    environment,
    event,
    keepAlive = false,
}) {
    const requestId = !keepAlive ? generateRequestId() : undefined;
    const workerPool = await getWorkerPool(absoluteIndexPath, handlerName, environment, requestId);

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
            terminateWorkerPool(absoluteIndexPath, handlerName, requestId);
        }
    }
}

module.exports = {
    invokeHandler,
};
