const pathMatch = require('path-match');
const { getFunctionResources } = require('./resources/getFunctionResources');

const API_EVENT_TYPES = ['Api', 'HttpApi'];

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
    const apiEventKeys = eventKeys.filter((key) => API_EVENT_TYPES.includes(events[key].Type));

    return apiEventKeys.map((key) => events[key]);
}

function getExpressRoute(awsPath) {
    return awsPath.replace(/({[a-zA-Z0-9]*})/g, (match) => {
        const parameterName = match.substring(1, match.length - 1);

        return `:${parameterName}`;
    });
}

function createRoute(awsPath) {
    if (awsPath === '/{proxy+}') {
        return () => true;
    }

    const expressRoute = getExpressRoute(awsPath);

    return route(expressRoute);
}

function getApiMapping(templatePath) {
    const functionResources = getFunctionResources(templatePath);
    const functionNames = Object.keys(functionResources);

    const mapping = [];

    functionNames.forEach((functionName) => {
        const functionResource = functionResources[functionName];
        const apiEvents = getApiEvents(functionResource);

        apiEvents
            .map((event) => ({
                httpMethod: event.Properties.Method.toUpperCase(),
                resource: event.Properties.Path,
                route: getExpressRoute(event.Properties.Path),
                match: createRoute(event.Properties.Path),
            }))
            .forEach((listener) => (
                mapping.push({
                    functionName,
                    functionResource,
                    listener,
                })
            ));
    });

    return mapping;
}

module.exports = {
    getApiMapping,
};
