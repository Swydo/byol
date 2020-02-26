const { env } = process;

async function handler(event, context, callback) {
    callback(null, {
        args: [event, context],
        env: { ...env },
    });
}

module.exports = {
    handler,
};
