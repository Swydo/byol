const fs = require('fs');
const path = require('path');
const { getFunctionResources } = require('./resources/getFunctionResources');
const { invokeHandler } = require('./invokeHandler');

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

    const options = {
        absoluteIndexPath,
        handlerName,
        environment,
        event,
        keepAlive,
        requestId,
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

    return { result, invocationType };
}

module.exports = {
    invokeFunction,
};
