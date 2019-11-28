const uuidv4 = require('uuid/v4');

function generateRequestId() {
    return uuidv4();
}

module.exports = {
    generateRequestId,
};
