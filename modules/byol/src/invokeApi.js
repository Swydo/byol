const { URL } = require('url');
const pathMatch = require('path-match');
const { getFunctionResources, invokeFunction } = require('./invokeFunction');
const { generateRequestId } = require('./generateRequestId');

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

function createRoute(awsPath) {
    const expressPath = awsPath.replace(/({[a-zA-Z0-9]*})/g, (match) => {
        const parameterName = match.substring(1, match.length - 1);

        return `:${parameterName}`;
    });

    if (awsPath === '/{proxy+}') {
        return () => true;
    }

    return route(expressPath);
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

function parseQueryParams(parsedUrl) {
    const queryStringParameters = {};
    const multiValueQueryStringParameters = {};

    parsedUrl.searchParams.forEach((value, key) => {
        queryStringParameters[key] = value;
        multiValueQueryStringParameters[key] = [
            ...multiValueQueryStringParameters[key] || [],
            value,
        ];
    });

    return { queryStringParameters, multiValueQueryStringParameters };
}

function parseHeaders(rawHeaders) {
    const headers = {};
    const multiValueHeaders = {};

    rawHeaders
        .reduce((sets, currentValue, index) => {
            if (index % 2) {
                const setIndex = Math.floor(index / 2);
                sets[setIndex].push(currentValue);
            } else {
                sets.push([currentValue]);
            }

            return sets;
        }, [])
        .forEach(([key, value]) => {
            headers[key] = value;
            multiValueHeaders[key] = [
                ...multiValueHeaders[key] || [],
                value,
            ];
        });

    return { headers, multiValueHeaders };
}

async function invokeApi({
    method,
    url,
    rawHeaders,
    body,
    ip,
}, {
    templatePath,
    envPath,
    region,
    keepAlive = false,
    profile = 'default',
} = {}) {
    const parsedUrl = new URL(url, 'http://localhost');

    const apiMapping = getApiMapping(templatePath);

    const matchingMapping = apiMapping.find((mapping) => (
        mapping.listener.httpMethod === method && mapping.listener.match(parsedUrl.pathname)
    ));

    if (!matchingMapping) {
        return {
            result: { statusCode: 404 },
        };
    }

    const requestId = generateRequestId();
    const pathParameters = matchingMapping.listener.match(parsedUrl.pathname) && { proxy: parsedUrl.pathname };
    const { headers, multiValueHeaders } = parseHeaders(rawHeaders);
    const { queryStringParameters, multiValueQueryStringParameters } = parseQueryParams(parsedUrl);
    const requestContext = {
        resourcePath: matchingMapping.listener.resource,
        httpMethod: method,
        identity: {
            sourceIp: ip,
        },
        requestId,
    };

    const event = {
        resource: matchingMapping.listener.resource,
        httpPath: parsedUrl.pathname,
        httpMethod: method,
        headers,
        multiValueHeaders,
        pathParameters,
        queryStringParameters,
        multiValueQueryStringParameters,
        requestContext,
        body,
    };
    return invokeFunction(matchingMapping.functionName, event, {
        templatePath,
        envPath,
        region,
        requestId,
        keepAlive,
        profile,
    });
}

module.exports = {
    invokeApi,
};
