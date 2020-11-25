function parseAttributeOption(attribute) {
    return (Array.isArray(attribute) ? attribute : [attribute]).reduce((overrides, mapping) => {
        const [key, value] = mapping.split('=');

        return {
            ...overrides,
            [key]: value,
        };
    }, {});
}

module.exports = {
    parseAttributeOption,
};
