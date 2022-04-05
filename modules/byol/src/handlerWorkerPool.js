const path = require('path');
const workerpool = require('workerpool');

const workerPoolMap = new Map();

function getWorkerPoolKey(workingDirectory, indexPath, handlerName, requestId) {
    if (requestId) {
        return `${workingDirectory}:${indexPath}:${handlerName}:${requestId}`;
    }

    return `${workingDirectory}:${indexPath}:${handlerName}`;
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

async function getWorkerPool(workingDirectory, indexPath, handlerName, environment = {}, requestId) {
    const poolKey = getWorkerPoolKey(workingDirectory, indexPath, handlerName, requestId);

    if (!workerPoolMap.has(poolKey)) {
        const pool = workerpool.pool(path.join(__dirname, 'assets', 'callHandlerProcess.js'), {
            workerType: 'process',
            forkOpts: {
                cwd: workingDirectory,
            },
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

        return getWorkerPool(workingDirectory, indexPath, handlerName, environment);
    }

    return pool;
}

module.exports = {
    getWorkerPool,
    terminateWorkerPool,
    terminateWorkerPools,
};
