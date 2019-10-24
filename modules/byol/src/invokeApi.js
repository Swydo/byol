const path = require('path');
const { getTemplate } = require('./getTemplate');
const { invokeFunction } = require('./invokeFunction');

const FUNCTION_RESOURCE_TYPE = 'AWS::Serverless::Function';
const API_EVENT_TYPE = 'Api';

function getApiEvents(resource) {
    if (!resource.Properties || !resource.Properties.Events) {
        return [];
    }

    const events = resource.Properties.Events;
    const eventKeys = Object.keys(events);
    const apiEventKeys = eventKeys.filter(key => events[key].Type === API_EVENT_TYPE);

    return apiEventKeys.map(key => events[key]);
}

function getApiMapping(resources) {
    const resourceKeys = Object.keys(resources);
    const functionResourceKeys = resourceKeys.filter(key => resources[key].Type === FUNCTION_RESOURCE_TYPE);

    return functionResourceKeys.map((functionResourceKey) => {
        const functionResource = resources[functionResourceKey];
        const apiEvents = getApiEvents(functionResource);

        const listeners = apiEvents.map(event => ({
            httpMethod: event.Properties.Method.toUpperCase(),
            path: event.Properties.Path,
        }));

        return {
            functionName: functionResourceKey,
            functionResource,
            listeners,
        };
    });
}

function invokeApi(httpMethod, httpPath, body, {
    templatePath,
    envPath,
} = {}) {
    const template = getTemplate(templatePath);

    if (!template.Resources) {
        throw new Error('TEMPLATE_RESOURCES_MISSING');
    }

    const apiMapping = getApiMapping(template.Resources);

    const match = apiMapping.find(mapping => (
        mapping.listeners.some(listener => listener.httpMethod === httpMethod && listener.path === httpPath)
    ));

    if (!match) {
        throw new Error('API_NOT_FOUND');
    }

    const event = {
        httpMethod,
        httpPath,
        body,
    };
    return invokeFunction(match.functionName, event, { templatePath, envPath });
}

module.exports = {
    invokeApi,
};
