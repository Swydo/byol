async function handler({ message }) {
    throw new Error(message || 'ERROR');
}

module.exports = {
    handler,
};
