const { env } = process;

async function handler(...args) {
    return {
        args,
        env,
    };
}

module.exports = {
    handler,
};
