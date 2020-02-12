const LAMBDA_PAYLOAD_BYTE_SIZE_LIMIT = 6000000;
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
    } else if (Buffer.byteLength(JSON.stringify(result)) >= LAMBDA_PAYLOAD_BYTE_SIZE_LIMIT) {
        process.send({
            error: {
                message: `Payload size is too large (limit ${LAMBDA_PAYLOAD_BYTE_SIZE_LIMIT})`,
                code: 'PAYLOAD_TOO_LARGE',
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

    if (!handler) {
        onHandlerResponse(new Error('HANDLER_NOT_FOUND'));
        return;
    }

    const maybePromise = handler(event, {}, onHandlerResponse);

    if (maybePromise && typeof maybePromise.then === 'function' && typeof maybePromise.catch === 'function') {
        maybePromise
            .then((res) => onHandlerResponse(null, res))
            .catch((err) => onHandlerResponse(err));
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
    case 'EXIT':
        process.exit(0);
        break;
    default:
        throw new Error('UNSUPPORTED MESSAGE');
    }
}

process.on('message', onMessage);
