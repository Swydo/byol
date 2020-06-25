const fs = require('fs');
const path = require('path');
const rawDebug = require('debug');
const { invokeHandler } = require('./invokeHandler');
const { DEFAULT_TEMPLATE_PATH, getTemplate } = require('./getTemplate');
const { generateRequestId } = require('./generateRequestId');

const FUNCTION_RESOURCE_TYPE = 'AWS::Serverless::Function';
const STACK_RESOURCE_TYPE = 'AWS::CloudFormation::Stack';

function getDebug(requestId) {
    return rawDebug(`byol:invoke:${requestId}`);
}

function getFunctionResources(templatePath = DEFAULT_TEMPLATE_PATH) {
    const template = getTemplate(templatePath);

    if (!template.Resources) {
        throw new Error('TEMPLATE_RESOURCES_MISSING');
    }

    const directResources = Object
        .keys(template.Resources)
        .filter((resourceKey) => template.Resources[resourceKey].Type === FUNCTION_RESOURCE_TYPE)
        .reduce((all, resourceKey) => ({
            ...all,
            [resourceKey]: template.Resources[resourceKey],
        }), {});

    const nestedResources = Object
        .values(template.Resources)
        .filter((resource) => resource.Type === STACK_RESOURCE_TYPE)
        .map((resource) => path.resolve(templatePath, '..', resource.Properties.TemplateURL))
        .reduce((all, nestedTemplatePath) => ({
            ...all,
            ...getFunctionResources(nestedTemplatePath),
        }), {});

    return {
        ...directResources,
        ...nestedResources,
    };
}

function getFunctionResource(templatePath, functionName) {
    const functionResources = getFunctionResources(templatePath);

    if (!functionResources[functionName]) {
        throw new Error('FUNCTION_NOT_DEFINED');
    }

    return functionResources[functionName];
}

function getFunctionEnvironment(envPath, functionName) {
    const envFileExists = fs.existsSync(envPath);

    if (!envFileExists) {
        return {};
    }

    const envString = fs.readFileSync(envPath, { encoding: 'utf8' });

    try {
        const allEnv = JSON.parse(envString);

        return allEnv && allEnv[functionName] ? allEnv[functionName] : {};
    } catch (e) {
        throw new Error('MALFORMED_ENV_FILE');
    }
}

function getAwsEnvironment({ profile, region }) {
    return {
        AWS_PROFILE: profile,
        AWS_REGION: region,
    };
}

async function invokeFunction(functionName, event, {
    templatePath = path.join(process.cwd(), 'template.yml'),
    envPath = path.join(process.cwd(), 'env.json'),
    region,
    requestId,
    keepAlive = false,
    profile = 'default',
} = {}) {
    const debug = getDebug(requestId || generateRequestId());

    const resource = getFunctionResource(templatePath, functionName);
    const environment = {
        ...getAwsEnvironment({ profile, region }),
        ...getFunctionEnvironment(envPath, functionName),
    };
    const {
        Properties: {
            Handler: handler,
            CodeUri: codeUri = '.',
            EventInvokeConfig: eventInvokeConfig,
        },
    } = resource;

    const [relativePathWithoutExtension, handlerName] = handler.split('.');

    const relativeIndexPath = `${relativePathWithoutExtension}.js`;
    const absoluteIndexPath = path.join(templatePath, '..', codeUri, relativeIndexPath);

    try {
        debug('Start');
        const options = {
            absoluteIndexPath,
            handlerName,
            environment,
            event,
            keepAlive,
        };

        let result;
        let invocationType;

        if (eventInvokeConfig) {
            invokeHandler(options);
            invocationType = 'Event';
        } else {
            result = await invokeHandler(options);
            invocationType = 'RequestResponse';
        }

        debug('End');

        return { result, invocationType };
    } catch (e) {
        debug('Error');

        throw e;
    }
}

module.exports = {
    getFunctionResources,
    invokeFunction,
};
