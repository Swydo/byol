const objectPath = require('object-path');

function resolveAttribute(template, templateOverrides = {}, resolvableValue) {
    const dotKey = resolvableValue.join('.');

    return objectPath.get(template.Resources, dotKey)
        || objectPath.get(templateOverrides.attributes, dotKey)
        || templateOverrides.attributes[dotKey];
}

const resolverMap = {
    'Fn::GetAtt': resolveAttribute,
};

function resolveValue(template, templateOverrides, value) {
    if (!value) {
        return null;
    }

    if (typeof value === 'object') {
        const resolvableKey = Object.keys(resolverMap).find((key) => value[key]);

        if (resolvableKey) {
            const resolver = resolverMap[resolvableKey];

            return resolver(template, templateOverrides, value[resolvableKey]);
        }
        return value;
    }

    return value;
}

module.exports = {
    resolveValue,
};
