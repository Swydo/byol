const pathMatch = require('path-match');
const { getTemplate } = require('./getTemplate');
const { invokeFunction } = require('./invokeFunction');

const FUNCTION_RESOURCE_TYPE = 'AWS::Serverless::Function';
const API_EVENT_TYPE = 'Api';

const route = pathMatch({
    sensitive: false,
    strict: false,
    end: false,
});

function getApiEvents(resource) {
    if (!resource.Properties || !resource.Properties.Events) {
        return [];
    }

    const events = resource.Properties.Events;
    const eventKeys = Object.keys(events);
    const apiEventKeys = eventKeys.filter(key => events[key].Type === API_EVENT_TYPE);

    return apiEventKeys.map(key => events[key]);
}

function createRoute(awsPath) {
    const expressPath = awsPath.replace(/({[a-zA-Z0-9]*})/g, (match) => {
        const parameterName = match.substring(1, match.length - 1);

        return `:${parameterName}`;
    });

    return route(expressPath);
}

function getApiMapping(resources) {
    const resourceKeys = Object.keys(resources);
    const functionNames = resourceKeys.filter(key => resources[key].Type === FUNCTION_RESOURCE_TYPE);

    const mapping = [];

    functionNames.forEach((functionName) => {
        const functionResource = resources[functionName];
        const apiEvents = getApiEvents(functionResource);

        apiEvents
            .map(event => ({
                httpMethod: event.Properties.Method.toUpperCase(),
                resource: event.Properties.Path,
                match: createRoute(event.Properties.Path),
            }))
            .forEach(listener => (
                mapping.push({
                    functionName,
                    functionResource,
                    listener,
                })
            ));
    });

    return mapping;
}

async function invokeApi(httpMethod, httpPath, body, {
    templatePath,
    envPath,
} = {}) {
    const template = getTemplate(templatePath);

    if (!template.Resources) {
        throw new Error('TEMPLATE_RESOURCES_MISSING');
    }

    const apiMapping = getApiMapping(template.Resources);

    const match = apiMapping.find(mapping => (
        mapping.listener.httpMethod === httpMethod && mapping.listener.match(httpPath)
    ));

    if (!match) {
        return { statusCode: 404 };
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
