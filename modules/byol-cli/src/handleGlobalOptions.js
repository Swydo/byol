const debug = require('debug');

function handleGlobalOptions({ silent, verbose }) {
    debug.enable('byol:*');
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
