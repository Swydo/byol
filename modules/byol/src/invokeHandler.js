const rawDebug = require('debug');
const { getWorkerPool, terminateWorkerPool } = require('./handlerWorkerPool');
const { generateRequestId } = require('./generateRequestId');

function getDebug(requestId) {
    return rawDebug(`byol:invoke:${requestId}`);
}

async function invokeHandler({
    debugPortStart,
    indexPath,
    handlerName,
    environment,
    event,
    keepAlive = false,
    requestId,
    workingDirectory,
}) {
    const id = requestId || generateRequestId();
    const debug = getDebug(id);

    const poolRequestId = keepAlive ? undefined : id;
    const workerPool = await getWorkerPool(indexPath, handlerName, environment, poolRequestId, {
        debugPortStart,
        forkOpts: {
            cwd: workingDirectory,
        },
    });

    try {
        debug('Start');
        const result = await workerPool.exec('callHandler', [{
            indexPath,
            handlerName,
            event,
            environment: {
                ...process.env,
                ...environment,
            },
        }]);

        debug('End');

        return result;
    } catch (e) {
        debug(e);

        // Mark this error so that byol-cli can return an appropriate status code later.
        e.handlerError = true;

        throw e;
    } finally {
        if (!keepAlive) {
            await terminateWorkerPool(workingDirectory, indexPath, handlerName, poolRequestId);
        }
    }
}

module.exports = {
    invokeHandler,
};
