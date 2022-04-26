const path = require('path');
const { getTemplate } = require('../getTemplate');

const STACK_RESOURCE_TYPE = 'AWS::CloudFormation::Stack';

function getResources(templatePath, resourceType) {
    const template = getTemplate(templatePath);

    if (!template.Resources) {
        throw new Error('TEMPLATE_RESOURCES_MISSING');
    }

    const directResources = Object
        .keys(template.Resources)
        .filter((resourceKey) => template.Resources[resourceKey].Type === resourceType)
        .reduce((all, resourceKey) => ({
            ...all,
            [resourceKey]: template.Resources[resourceKey],
        }), {});

    const nestedResources = Object
        .values(template.Resources)
        .filter((resource) => resource.Type === STACK_RESOURCE_TYPE)
        .map((resource) => path.resolve(templatePath, '..', resource.Properties.TemplateURL))
        .reduce((all, nestedTemplatePath) => ({
            ...all,
            ...getResources(nestedTemplatePath, resourceType),
        }), {});

    return {
        ...directResources,
        ...nestedResources,
    };
}

module.exports = {
    getResources,
};
