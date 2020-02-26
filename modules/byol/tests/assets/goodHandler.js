const { env } = process;

async function handler(event, context) {
    return {
        args: [event, context],
        env: { ...env },
    };
}

module.exports = {
    handler,
};
