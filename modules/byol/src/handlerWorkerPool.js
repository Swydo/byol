const path = require('path');
const workerpool = require('workerpool');

const workerPoolMap = new Map();

function terminateWorkerPool(handler) {
    const { pool } = workerPoolMap.get(handler);
    const terminationPromise = pool.terminate();

    workerPoolMap.delete(handler);

    return terminationPromise;
}

function terminateWorkerPools() {
    const terminationPromises = [];

    workerPoolMap.forEach((pool, key) => {
        terminationPromises.push(terminateWorkerPool(key));
    });

    return Promise.all(terminationPromises);
}

async function getWorkerPool(handler, environment = {}) {
    if (!workerPoolMap.has(handler)) {
        const pool = workerpool.pool(path.join(__dirname, 'assets', 'callHandlerProcess.js'));

        workerPoolMap.set(handler, {
            pool,
            environment,
        });
    }

    const { pool, environment: poolEnvironment } = workerPoolMap.get(handler);

    if (JSON.stringify(poolEnvironment) !== JSON.stringify(environment)) {
        terminateWorkerPool(handler);

        return getWorkerPool(handler, environment);
    }

    return pool;
}


module.exports = {
    getWorkerPool,
    terminateWorkerPool,
    terminateWorkerPools,
};
