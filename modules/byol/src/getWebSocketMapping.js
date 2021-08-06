const { getTemplate } = require('./getTemplate');

function toFilteredMap(obj, filter) {
    const map = new Map();
    Object.keys(obj).forEach((key) => {
        if (filter(obj[key])) {
            map.set(key, obj[key]);
        }
    });
    return map;
}

function getYamlVariables(target) {
    if (typeof target === 'string') {
        return [target];
    }
    if (typeof target === 'object') {
        const key = Object.keys(target)[0];

        switch (key) {
        case 'Fn::Sub': {
            const regx = new RegExp(/\$\{([\D]+?)\}/g);
            const references = Array.from(target[key].matchAll(regx));
            return references.map((item) => item[1]);
        }
        default:
            break;
        }
    }
    return [];
}

const WEBSOCKET_PROTOCOL_TYPE = 'WEBSOCKET';
const API_GATEWAY_RESOURCE = 'AWS::ApiGatewayV2::Api';
const API_GATEWAY_ROUTE = 'AWS::ApiGatewayV2::Route';
const API_GATEWAY_INTEGRATION = 'AWS::ApiGatewayV2::Integration';
const API_GATEWAY_ROUTE_RESPONSE = 'AWS::ApiGatewayV2::RouteResponse';
const API_GATEWAY_INTEGRATION_RESPONSE = 'AWS::ApiGatewayV2::IntegrationResponse';
const API_GATEWAY_STAGE = 'AWS::ApiGatewayV2::Stage';
const SERVERLESS_FUNCTION = 'AWS::Serverless::Function';

function getResourceOfType(template, resourceType) {
    return Object
        .keys(template.Resources)
        .filter((resourceKey) => template.Resources[resourceKey].Type === resourceType)
        .reduce((all, resourceKey) => ({
            ...all,
            [resourceKey]: template.Resources[resourceKey],
        }), {});
}

function getWebSocketApis(template) {
    const apis = getResourceOfType(template, API_GATEWAY_RESOURCE);
    const webSocketApis = toFilteredMap(apis, (api) => api.Properties.ProtocolType === WEBSOCKET_PROTOCOL_TYPE);
    return webSocketApis;
}

function filterOnApiId(apiName) {
    return (item) => item.Properties.ApiId.Ref === apiName;
}

function getRoutesForApi(template, apiName) {
    return toFilteredMap(getResourceOfType(template, API_GATEWAY_ROUTE), filterOnApiId(apiName));
}

function getIntegrationsForApi(template, apiName) {
    return toFilteredMap(getResourceOfType(template, API_GATEWAY_INTEGRATION), filterOnApiId(apiName));
}

function getRouteResponsesForApi(template, apiName) {
    return toFilteredMap(getResourceOfType(template, API_GATEWAY_ROUTE_RESPONSE), filterOnApiId(apiName));
}

function getIntegrationResponsesForApi(template, apiName) {
    return toFilteredMap(getResourceOfType(template, API_GATEWAY_INTEGRATION_RESPONSE), filterOnApiId(apiName));
}

function getStagesForApi(template, apiName) {
    return toFilteredMap(getResourceOfType(template, API_GATEWAY_STAGE), filterOnApiId(apiName));
}

function getIntegrationForRoute(route, integrations) {
    const variables = getYamlVariables(route.Properties.Target);
    return variables.map((item) => {
        if (integrations.has(item)) {
            return integrations.get(item);
        }
        return undefined;
    }).filter((item) => !!item)[0];
}

function getIntegrationResponseForRoute(integration, integrationsResponses, integrations) {
    // eslint-disable-next-line no-unused-vars
    return Array.from(integrationsResponses.entries()).map(([_, integrationResponse]) => {
        if (integrationResponse.Properties.IntegrationId) {
            if (integration === integrations.get(integrationResponse.Properties.IntegrationId.Ref)) {
                return integrationResponse;
            }
        }
        return undefined;
    }).find((x) => !!x);
}

function getLambdaNameFromIntegration(integration, lambdaFunctions) {
    const yamlVariables = getYamlVariables(integration.Properties.IntegrationUri);
    return yamlVariables
        .flatMap((item) => item.split('.'))
        .filter((name) => lambdaFunctions.has(name))[0];
}

function getRouteResponse(routeName, apiRouteResponses) {
    // eslint-disable-next-line no-restricted-syntax
    for (const [, value] of apiRouteResponses) {
        if (value.Properties.RouteId.Ref === routeName) {
            return value;
        }
    }
    return undefined;
}

function getApiGatewayRoutes(template, apiName) {
    const apiRoutes = getRoutesForApi(template, apiName);
    const apiRouteResponses = getRouteResponsesForApi(template, apiName);
    const apiIntegrations = getIntegrationsForApi(template, apiName);
    const apiIntegrationResponses = getIntegrationResponsesForApi(template, apiName);
    const lambdaFunctions = new Map(Object.entries(getResourceOfType(template, SERVERLESS_FUNCTION)));

    const routes = new Map();
    // eslint-disable-next-line no-restricted-syntax
    for (const [routeName, route] of apiRoutes.entries()) {
        const routeResponse = getRouteResponse(routeName, apiRouteResponses);
        const integration = getIntegrationForRoute(route, apiIntegrations);
        const integrationResponse = getIntegrationResponseForRoute(
            integration,
            apiIntegrationResponses,
            apiIntegrations,
        );
        const lambdaName = getLambdaNameFromIntegration(integration, lambdaFunctions);
        const lambda = lambdaFunctions.get(lambdaName);
        const routeInfo = {
            route,
            routeResponse,
            integration,
            integrationResponse,
            lambdaName,
            lambda,
        };
        routes.set(route.Properties.RouteKey, routeInfo);
    }

    return routes;
}

function getApiStage(template, apiName) {
    const stages = Array.from(getStagesForApi(template, apiName).entries());
    if (stages) {
        const [, stage] = stages[0];
        return stage;
    }
    return undefined;
}

function getWebSocketMapping(templatePath) {
    const template = getTemplate(templatePath);
    const gatewayApis = getWebSocketApis(template);
    const apis = new Map();
    Array.from(gatewayApis.entries()).forEach(([key, api]) => {
        apis.set(key, {
            api,
            routes: getApiGatewayRoutes(template, key),
            stage: getApiStage(template, key),
        });
    });

    return apis;
}

module.exports = {
    getWebSocketMapping,
};
