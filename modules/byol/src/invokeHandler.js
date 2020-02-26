const { getWorkerPool } = require('./handlerWorkerPool');

async function invokeHandler({
    absoluteIndexPath,
    handlerName,
    environment,
    event,
}) {
    const workerPool = await getWorkerPool(handlerName, environment);

    return await workerPool.exec('callHandler', [{
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
