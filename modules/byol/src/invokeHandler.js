const path = require('path');
const { fork } = require('child_process');

async function invokeHandler({
    absoluteIndexPath,
    handlerName,
    environment,
    event,
}) {
    const forkOptions = {
        env: {
            ...process.env,
            ...environment,
        },
    };
    const forkProcess = fork(path.join(__dirname, 'assets', 'callHandlerProcess.js'), forkOptions);

    return new Promise(((resolve, reject) => {
        forkProcess.send({
            absoluteIndexPath,
            handlerName,
            event,
        });

        let hadResponse = false;

        forkProcess.on('message', ({ error, result }) => {
            hadResponse = true;

            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });

        forkProcess.on('exit', () => {
            if (!hadResponse) {
                hadResponse = true;

                reject(new Error('FORK_DIED'));
            }
        });
    }));
}

module.exports = {
    invokeHandler,
};
