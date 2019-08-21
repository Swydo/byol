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
    } else {
        process.send({ result });
    }
}

function callHandler({
    absoluteIndexPath,
    handlerName,
    event,
}) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { [handlerName]: handler } = require(absoluteIndexPath);

    const maybePromise = handler(event, {}, onHandlerResponse);

    if (maybePromise && typeof maybePromise.then === 'function' && typeof maybePromise.catch === 'function') {
        maybePromise
            .then(res => onHandlerResponse(null, res))
            .catch(err => onHandlerResponse(err));
    }
}

function onMessage(message) {
    const {
        type,
        payload,
    } = message;

    switch (type) {
    case 'CALL':
        callHandler(payload);
        break;
    case 'DIE':
        process.exit(0);
        break;
    default:
        throw new Error('UNSUPPORTED MESSAGE');
    }
}

process.on('message', onMessage);
