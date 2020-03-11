const { v4: uuidv4 } = require('uuid');

function generateRequestId() {
    return uuidv4();
}

module.exports = {
    generateRequestId,
};
