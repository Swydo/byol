const path = require('path');
const workerpool = require('workerpool');

const workerPoolMap = new Map();

function getWorkerPoolKey(absoluteIndexPath, handlerName, requestId) {
    if (requestId) {
        return `${absoluteIndexPath}:${handlerName}:${requestId}`;
    }

    return `${absoluteIndexPath}:${handlerName}`;
}

function terminateWorkerPool(absoluteIndexPath, handlerName, requestId) {
    const poolKey = getWorkerPoolKey(absoluteIndexPath, handlerName, requestId);

    const { pool } = workerPoolMap.get(poolKey);
    const terminationPromise = pool.terminate();

    workerPoolMap.delete(poolKey);

    return terminationPromise;
}

function terminateWorkerPools() {
    const terminationPromises = [];

    workerPoolMap.forEach((pool) => {
        const { absoluteIndexPath, handlerName, requestId } = pool;
        terminationPromises.push(terminateWorkerPool(absoluteIndexPath, handlerName, requestId));
    });

    return Promise.all(terminationPromises);
}

async function getWorkerPool(absoluteIndexPath, handlerName, environment = {}, requestId) {
    const poolKey = getWorkerPoolKey(absoluteIndexPath, handlerName, requestId);

    if (!workerPoolMap.has(poolKey)) {
        const pool = workerpool.pool(path.join(__dirname, 'assets', 'callHandlerProcess.js'));

        workerPoolMap.set(poolKey, {
            pool,
            absoluteIndexPath,
            handlerName,
            environment,
            requestId,
        });
    }

    const { pool, environment: poolEnvironment } = workerPoolMap.get(poolKey);

    if (JSON.stringify(poolEnvironment) !== JSON.stringify(environment)) {
        terminateWorkerPool(poolKey);

        return getWorkerPool(absoluteIndexPath, handlerName, environment);
    }

    return pool;
}

module.exports = {
    getWorkerPool,
    terminateWorkerPool,
    terminateWorkerPools,
};
