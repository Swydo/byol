let handledResponse = false;

function onHandlerResponse(error, result) {
    if (handledResponse) {
        return;
    }

    handledResponse = true;

    if (error) {
        process.send({
            error: {
                message: error.message,
                code: error.code,
            },
        });
        process.exit(1);
    } else {
        process.send({ result });
        process.exit(0);
    }
}

function onMessage(message) {
    const {
        absoluteIndexPath,
        handlerName,
        event,
    } = message;

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { [handlerName]: handler } = require(absoluteIndexPath);

    const maybePromise = handler(event, {}, onHandlerResponse);

    if (maybePromise && typeof maybePromise.then === 'function' && typeof maybePromise.catch === 'function') {
        maybePromise
            .then(res => onHandlerResponse(null, res))
            .catch(err => onHandlerResponse(err));
    }
}

process.on('message', onMessage);
