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
    return awsPath.replace(/({[a-zA-Z0-9]*\+?})/g, (match) => {
        // Strip curly brackets.
        let parameterName = match.substring(1, match.length - 1);

        if (parameterName.endsWith('+')) {
            parameterName = `${parameterName.substring(0, parameterName.length - 1)}*`;
        }

        return `:${parameterName}`;
    });
}

function createRoute(awsPath) {
    const expressRoute = getExpressRoute(awsPath);
    const routeMatch = route(expressRoute);

    return (...args) => {
        const params = routeMatch(...args);

        // Wildcards result in array of segments. Join them to recreate the path.
        return Object
            .entries(params)
            .reduce((map, [key, value]) => ({
                ...map,
                [key]: Array.isArray(value) ? value.join('/') : value,
            }), {});
    };
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
                type: event.Type,
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
