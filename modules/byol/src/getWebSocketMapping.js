const { getResources } = require('./resources/getResources');
const { getFunctionResources } = require('./resources/getFunctionResources');
const { getTemplate } = require('./getTemplate');

function toMap(obj) {
    const map = new Map();
    Object.keys(obj).forEach(key => map.set(key, obj[key]));
    return map;
}

function resolveReferences(templatePath, target, type) {
    const template = getTemplate(templatePath);
    const map = new Map();
    if(typeof target === 'string'){
        map.set(target, templat[target]);
    }
    else if (typeof target === 'object') {
        const key = Object.keys(target)[0];

        switch (key) {
            case 'Fn::Sub': {
                const regx = new RegExp(/\$\{([\D]+?)\}/g);
                const references = Array.from(target[key].matchAll(regx));
                references.forEach(item => {
                    const split = item[1].split('.')
                    if(!type || isResourceType(template.Resources[split[0]], type)) {
                        map.set(split[0], template.Resources[split[0]])
                    }
                });
                break;
            }
            default:
                break;
        }
    }

    return map;
}

function isResourceType(resource, type) {
    return resource?.Type === type;
}

function getIntegrationLambdaName(templatePath, integration) {
    const references = resolveReferences(templatePath, integration.Properties.IntegrationUri, 'AWS::Serverless::Function')
    for(const [key, value] of references) {
        if(value.Type === 'AWS::Serverless::Function') {
            return key;
        }
    }


    return undefined;
}



function getApiGatewayRoutes(templatePath) {
    const mappedRoutes = new Map();
    const routes = toMap(getResources(templatePath, 'AWS::ApiGatewayV2::Route'));

    routes.forEach((value, key) => {
        const references = resolveReferences(templatePath, value.Properties.Target, 'AWS::ApiGatewayV2::Integration');
        const [_, integration] = [...references.entries()][0];
        if (integration) {
           const lambda = getIntegrationLambdaName(templatePath, integration);
            mappedRoutes.set(value.Properties.RouteKey, {
                route: value,
                integration: integration,
                lambdaName: lambda,
            })

        }
    });

    return mappedRoutes;
}

function getRouteSelector(templatePath) {
    const api = getResources(templatePath, 'AWS::ApiGatewayV2::Api');
    return Object.keys(api).map(key => api[key].Properties.RouteSelectionExpression)[0];
}


function getWebSocketMapping(templatePath) {
    const mapping = getApiGatewayRoutes(templatePath);
    const routeSelectionExpression = getRouteSelector(templatePath);
    return {
        routeSelectionExpression,
        routes: mapping,
    };
}

module.exports = {
    getWebSocketMapping,
};
