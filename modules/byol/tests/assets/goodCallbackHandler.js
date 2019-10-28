const { env } = process;

async function handler(...args) {
    const callback = args[args.length - 1];

    callback(null, {
        args,
        env,
    });
}

module.exports = {
    handler,
};
