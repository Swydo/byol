const path = require('path');
const workerpool = require('workerpool');

const workerPoolMap = new Map();

function getWorkerPoolKey(indexPath, handlerName, requestId, poolOptions) {
    if (requestId) {
        return `${indexPath}:${handlerName}:${requestId}:${JSON.stringify(poolOptions)}`;
    }

    return `${indexPath}:${handlerName}:${JSON.stringify(poolOptions)}`;
}

function terminateWorkerPool(workingDirectory, indexPath, handlerName, requestId) {
    const poolKey = getWorkerPoolKey(workingDirectory, indexPath, handlerName, requestId);

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

async function getWorkerPool(indexPath, handlerName, environment = {}, requestId, poolOptions = {}) {
    const poolKey = getWorkerPoolKey(indexPath, handlerName, requestId, poolOptions);

    if (!workerPoolMap.has(poolKey)) {
        const pool = workerpool.pool(path.join(__dirname, 'assets', 'callHandlerProcess.js'), {
            workerType: 'process',
            ...poolOptions,
        });

        workerPoolMap.set(poolKey, {
            pool,
            indexPath,
            handlerName,
            environment,
            requestId,
        });
    }

    const { pool, environment: poolEnvironment } = workerPoolMap.get(poolKey);

    if (JSON.stringify(poolEnvironment) !== JSON.stringify(environment)) {
        terminateWorkerPool(poolKey);

        return getWorkerPool(indexPath, handlerName, environment, requestId, poolOptions);
    }

    return pool;
}

module.exports = {
    getWorkerPool,
    terminateWorkerPool,
    terminateWorkerPools,
};
