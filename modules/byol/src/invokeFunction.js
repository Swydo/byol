const fs = require('fs');
const path = require('path');
const { yamlParse } = require('yaml-cfn');
const { invokeHandler } = require('./invokeHandler');
const uuidv4 = require('uuid/v4');
const rawDebug = require('debug');

function generateRequestId() {
    return uuidv4();
}

function getDebug(requestId) {
    return rawDebug(`byol:invoke:${requestId}`);
}

function getTemplate() {
    const templatePath = path.join(process.cwd(), 'template.yml');

    const templateString = fs.readFileSync(templatePath, { encoding: 'utf8' });

    return yamlParse(templateString);
}

function getFunctionResource(functionName) {
    const template = getTemplate();

    return template.Resources[functionName];
}

function getEnvironment(functionName) {
    const envPath = path.join(process.cwd(), 'env.json');
    const envString = fs.readFileSync(envPath, { encoding: 'utf8' });

    return JSON.parse(envString)[functionName];
}

async function invokeFunction(functionName, event) {
    const requestId = generateRequestId();
    const debug = getDebug(requestId);

    const resource = getFunctionResource(functionName);
    const environment = getEnvironment(functionName);
    const {
        Properties: {
            Handler: handler,
            CodeUri: codeUri,
        },
    } = resource;

    const [relativePathWithoutExtension, handlerName] = handler.split('.');

    const relativeIndexPath = `${relativePathWithoutExtension}.js`;
    const absoluteIndexPath = path.join(process.cwd(), codeUri, relativeIndexPath);

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
