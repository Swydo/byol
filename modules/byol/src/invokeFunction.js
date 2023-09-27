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
    const awsEnvironment = {};

    if (region) {
        awsEnvironment.AWS_REGION = region;
    }

    if (profile) {
        awsEnvironment.AWS_PROFILE = profile;
    }

    return awsEnvironment;
}

async function invokeFunction(functionName, event, {
    templatePath = path.join(process.cwd(), 'template.yml'),
    envPath = path.join(process.cwd(), 'env.json'),
    debugPortStart,
    region,
    requestId,
    keepAlive = false,
    profile,
    invocationType = 'RequestResponse',
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
        },
    } = resource;

    const [relativePathWithoutExtension, handlerName] = handler.split('.');

    const workingDirectory = path.join(templatePath, '..', codeUri);
    const indexPath = `${relativePathWithoutExtension}.js`;

    const options = {
        indexPath,
        debugPortStart,
        handlerName,
        environment,
        event,
        keepAlive,
        requestId,
        workingDirectory,
    };

    let result;
    if (invocationType === 'Event') {
        invokeHandler(options);
    } else {
        result = await invokeHandler(options);
    }

    return { result };
}

module.exports = {
    invokeFunction,
};
