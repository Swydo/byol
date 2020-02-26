const workerpool = require('workerpool');

const LAMBDA_PAYLOAD_BYTE_SIZE_LIMIT = 6000000;

async function callHandler({
    absoluteIndexPath,
    handlerName,
    event,
    environment,
}) {
    Object.keys(process.env).forEach((envKey) => delete process.env[envKey]);
    Object.keys(environment).forEach((envKey) => {
        process.env[envKey] = environment[envKey];
    });

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { [handlerName]: handler } = require(absoluteIndexPath);

    if (!handler) {
        throw new Error('HANDLER_NOT_FOUND');
    }

    const result = await new Promise(((resolve, reject) => {
        const maybePromise = handler(event, {}, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });

        if (maybePromise && typeof maybePromise.then === 'function' && typeof maybePromise.catch === 'function') {
            maybePromise
                .then((res) => resolve(res))
                .catch((err) => reject(err));
        }
    }));

    if (Buffer.byteLength(JSON.stringify(result)) >= LAMBDA_PAYLOAD_BYTE_SIZE_LIMIT) {
        throw new Error('PAYLOAD_TOO_LARGE');
    }

    return result;
}

workerpool.worker({
    callHandler,
});
