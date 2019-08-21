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
            type: 'CALL',
            payload: {
                absoluteIndexPath,
                handlerName,
                event,
            },
        });

        let hadResponse = false;

        forkProcess.on('message', (message) => {
            hadResponse = true;

            forkProcess.send({ type: 'DIE' });

            const { error, result } = message;

            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });

        forkProcess.on('exit', () => {
            if (!hadResponse) {
                reject(new Error('FORK_DIED'));
            }
        });
    }));
}

module.exports = {
    invokeHandler,
};
