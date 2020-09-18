const rawDebug = require('debug');
const { getWorkerPool, terminateWorkerPool } = require('./handlerWorkerPool');
const { generateRequestId } = require('./generateRequestId');

function getDebug(requestId) {
    return rawDebug(`byol:invoke:${requestId}`);
}

async function invokeHandler({
    absoluteIndexPath,
    handlerName,
    environment,
    event,
    keepAlive = false,
    requestId,
}) {
    const id = requestId || generateRequestId();
    const debug = getDebug(id);

    const poolRequestId = keepAlive ? undefined : id;
    const workerPool = await getWorkerPool(absoluteIndexPath, handlerName, environment, poolRequestId);

    try {
        debug('Start');
        const result = await workerPool.exec('callHandler', [{
            absoluteIndexPath,
            handlerName,
            event,
            environment: {
                ...process.env,
                ...environment,
            },
        }]);

        debug('End', result);

        return result;
    } catch (e) {
        debug(e);

        // Mark this error so that byol-cli can return an appropriate status code later.
        e.handlerError = true;

        throw e;
    } finally {
        if (!keepAlive) {
            terminateWorkerPool(absoluteIndexPath, handlerName, requestId);
        }
    }
}

module.exports = {
    invokeHandler,
};
