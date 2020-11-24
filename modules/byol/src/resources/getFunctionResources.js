const { getResources } = require('./getResources');

const FUNCTION_RESOURCE_TYPE = 'AWS::Serverless::Function';

function getFunctionResources(templatePath) {
    return getResources(templatePath, FUNCTION_RESOURCE_TYPE);
}

module.exports = {
    getFunctionResources,
};
