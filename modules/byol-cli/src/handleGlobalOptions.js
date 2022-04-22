const debug = require('debug');

function handleGlobalOptions({ inspect, silent, verbose }) {
    debug.enable('byol:*');

    if (inspect) {
        // Fake being inspected to have workerpool start child processes with --inspect.
        // See https://github.com/FormidableLabs/workerpool/blob/master/lib/WorkerHandler.js#L41
        const processExecArgv = process.execArgv.join(' ');
        const inspectorActive = processExecArgv.indexOf('--inspect') !== -1;

        if (inspect && !inspectorActive) {
            process.execArgv.push('--inspect');
        }
    }

    if (verbose) {
        debug.enable('verbose:*, byol:*');
    }

    if (silent) {
        debug.disable();
    }
}

module.exports = {
    handleGlobalOptions,
};
