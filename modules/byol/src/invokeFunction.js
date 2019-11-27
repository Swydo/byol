const fs = require('fs');
const path = require('path');
const rawDebug = require('debug');
const { invokeHandler } = require('./invokeHandler');
const { getTemplate } = require('./getTemplate');
const { generateRequestId } = require('./generateRequestId');

function getDebug(requestId) {
    return rawDebug(`byol:invoke:${requestId}`);
}

function getFunctionResource(templatePath, functionName) {
    const template = getTemplate(templatePath);

    if (!template.Resources) {
        throw new Error('TEMPLATE_RESOURCES_MISSING');
    }

    if (!template.Resources[functionName]) {
        throw new Error('FUNCTION_NOT_DEFINED');
    }

    return template.Resources[functionName];
}

function getEnvironment(envPath, functionName) {
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

async function invokeFunction(functionName, event, {
    templatePath = path.join(process.cwd(), 'template.yml'),
    envPath = path.join(process.cwd(), 'env.json'),
} = {}) {
    const requestId = generateRequestId();
    const debug = getDebug(requestId);

    const resource = getFunctionResource(templatePath, functionName);
    const environment = getEnvironment(envPath, functionName);
    const {
        Properties: {
            Handler: handler,
            CodeUri: codeUri = '.',
        },
    } = resource;

    const [relativePathWithoutExtension, handlerName] = handler.split('.');

    const relativeIndexPath = `${relativePathWithoutExtension}.js`;
    const absoluteIndexPath = path.join(templatePath, '..', codeUri, relativeIndexPath);

    try {
        debug('Start');

        const result = await invokeHandler({
            absoluteIndexPath,
            handlerName,
            environment,
            event,
        });

        debug('End');

        return result;
    } catch (e) {
        debug('Error');

        throw e;
    }
}

module.exports = {
    invokeFunction,
};
