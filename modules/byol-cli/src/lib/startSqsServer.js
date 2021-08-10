const AWS = require('aws-sdk');
const { invokeFunction } = require('@swydo/byol');
const debug = require('debug')('byol:sqs');
const { getSqsMapping } = require('@swydo/byol');
const promiseRetry = require('promise-retry');
const { Consumer } = require('sqs-consumer');

async function startSqsServer({
    environmentOptions: {
        templateOverrides,
        sqsEndpointUrl,
    } = {},
    invokeOptions,
}) {
    const mapping = await promiseRetry(async (retry) => {
        try {
            return await getSqsMapping(invokeOptions.templatePath, { sqsEndpointUrl, templateOverrides });
        } catch (e) {
            debug('Error getting SQS mapping:', e.message);

            retry(e);
        }

        return null;
    }, {
        maxTimeout: 4000,
        retries: 10,
    });

    mapping.forEach((currentMapping) => {
        const { functionName, listener } = currentMapping;

        debug(functionName, 'at sqs', listener.queueUrl);

        const consumer = Consumer.create({
            attributeNames: ['All'],
            queueUrl: listener.queueUrl,
            handleMessage: async (message) => {
                const event = {
                    Records: [{
                        body: message.Body,
                        md5OfBody: message.MD5OfBody,
                        messageId: message.MessageId,
                        receiptHandle: message.ReceiptHandle,
                        eventSource: 'aws:sqs',
                        eventSourceARN: listener.queueArn,
                        region: AWS.config.region,
                        attributes: message.Attributes,
                        messageAttributes: message.MessageAttributes,
                    }],
                };

                return invokeFunction(currentMapping.functionName, event, invokeOptions);
            },
        });

        consumer.on('error', (err) => {
            debug(err);
        });

        consumer.on('processing_error', (err) => {
            debug(err);
        });

        consumer.start();
    });
}

module.exports = {
    startSqsServer,
};
