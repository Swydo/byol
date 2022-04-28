const { getResources } = require('./getResources');
const { DEFAULT_TEMPLATE_PATH } = require('../getTemplate');

const FUNCTION_RESOURCE_TYPE = 'AWS::Serverless::Function';

function getFunctionResources(templatePath = DEFAULT_TEMPLATE_PATH) {
    return getResources(templatePath, FUNCTION_RESOURCE_TYPE);
}

module.exports = {
    getFunctionResources,
};
