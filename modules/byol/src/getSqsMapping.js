const AWS = require('aws-sdk');
const { getTemplate } = require('./getTemplate');
const { resolveValue } = require('./cloudformation/resolveValue');
const { getFunctionResources } = require('./resources/getFunctionResources');

const SQS_EVENT_TYPES = ['SQS'];

function getSqsEvents(resource) {
    if (!resource.Properties || !resource.Properties.Events) {
        return [];
    }

    const events = resource.Properties.Events;
    const eventKeys = Object.keys(events);
    const sqsEventKeys = eventKeys.filter((key) => SQS_EVENT_TYPES.includes(events[key].Type));

    return sqsEventKeys.map((key) => events[key]);
}

async function resolveQueueUrl(queueArn, { sqsEndpointUrl }) {
    const sqs = new AWS.SQS({ endpoint: sqsEndpointUrl });

    const { QueueUrl } = await sqs.getQueueUrl({ QueueName: queueArn }).promise();

    return QueueUrl;
}

async function getSqsMapping(templatePath, { sqsEndpointUrl, templateOverrides }) {
    const template = getTemplate(templatePath);
    const functionResources = getFunctionResources(templatePath);
    const functionNames = Object.keys(functionResources);

    const mapping = [];

    functionNames.forEach((functionName) => {
        const functionResource = functionResources[functionName];
        const sqsEvents = getSqsEvents(functionResource);

        sqsEvents
            .map((event) => {
                const queueArn = resolveValue(template, templateOverrides, event.Properties.Queue);

                return ({
                    queueArn,
                    queueUrlPromise: resolveQueueUrl(queueArn, { sqsEndpointUrl }),
                    batchSize: event.Properties.BatchSize,
                });
            })
            .forEach((listener) => (
                mapping.push({
                    functionName,
                    functionResource,
                    listener,
                })
            ));
    });

    const mappingPromises = mapping.map(async (map) => {
        const queueUrl = await map.listener.queueUrlPromise;

        return {
            ...map,
            listener: {
                ...map.listener,
                queueUrl,
            },
        };
    });

    return Promise.all(mappingPromises);
}

module.exports = {
    getSqsMapping,
};
