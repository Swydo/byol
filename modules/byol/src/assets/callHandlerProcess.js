const path = require('path');
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
    const handlerResult = await new Promise(((resolve, reject) => {
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

    // Timeout delay is required in order to print console logs
    // that are omitted otherwise
    await new Promise((resolve) => {
        setTimeout(resolve, 10);
    });

    return handlerResult;
}

async function executeWithXRay(segmentName, handler, event, awsContext) {
    const AWSXRay = getXRay();
    const segment = new AWSXRay.Segment(segmentName);
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
    indexPath,
    handlerName,
    event,
    environment,
}) {
    process.env = environment;

    const absoluteIndexPath = path.join(process.cwd(), indexPath);

    const { [handlerName]: handler } = await import(absoluteIndexPath);
    const awsContext = {
        awsRequestId: generateRequestId(),
        getRemainingTimeInMillis() {
            return 365 * 24 * 60 * 60 * 1000;
        }
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
