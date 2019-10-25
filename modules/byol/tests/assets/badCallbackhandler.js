async function handler({ message }, context, callback) {
    callback(new Error(message || 'ERROR'));
}

module.exports = {
    handler,
};
