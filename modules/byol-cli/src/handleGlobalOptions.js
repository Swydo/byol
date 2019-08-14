const debug = require('debug');

function handleGlobalOptions({ silent }) {
    if (silent) {
        debug.disable();
    } else {
        debug.enable('byol:*');
    }
}

module.exports = {
    handleGlobalOptions,
};
