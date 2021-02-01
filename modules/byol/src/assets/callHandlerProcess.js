const workerpool = require('workerpool');
const { generateRequestId } = require('../generateRequestId');

const LAMBDA_PAYLOAD_BYTE_SIZE_LIMIT = 6000000;

function getXRay() {
    try {
        // eslint-disable-next-line global-require
        return require('aws-xray-sdk-core');
    } catch (e) {
        return null;
    }
}

function hasXRay() {
    return Boolean(getXRay());
}

async function execute(handler, event, awsContext) {
    return new Promise(((resolve, reject) => {
        const maybePromise = handler(event, awsContext, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });

        if (
            maybePromise
            && typeof maybePromise.then === 'function'
            && typeof maybePromise.catch === 'function'
        ) {
            maybePromise
                .then((res) => resolve(res))
                .catch((err) => reject(err));
        }
    }));
}

async function executeWithXRay(segmentName, handler, event, awsContext) {
    const AWSXRay = getXRay();
    const segment = new AWSXRay.Segment();
    const ns = AWSXRay.getNamespace();

    return ns.runAndReturn(async () => {
        AWSXRay.setSegment(segment);

        try {
            const result = await execute(handler, event, awsContext);

            segment.close();

            return result;
        } catch (e) {
            segment.close(e);

            throw e;
        }
    });
}

async function callHandler({
    absoluteIndexPath,
    handlerName,
    event,
    environment,
}) {
    process.env = environment;

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { [handlerName]: handler } = require(absoluteIndexPath);
    const awsContext = {
        awsRequestId: generateRequestId(),
    };

    if (!handler) {
        throw new Error('HANDLER_NOT_FOUND');
    }

    let result;

    if (hasXRay()) {
        result = executeWithXRay(`${absoluteIndexPath}#${handlerName}`, handler, event, awsContext);
    } else {
        result = execute(handler, event, awsContext);
    }

    if (result && Buffer.byteLength(JSON.stringify(result)) >= LAMBDA_PAYLOAD_BYTE_SIZE_LIMIT) {
        throw new Error('PAYLOAD_TOO_LARGE');
    }

    return result;
}

workerpool.worker({
    callHandler,
});
