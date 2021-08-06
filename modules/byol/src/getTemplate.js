const fs = require('fs');
const path = require('path');
const { yamlParse } = require('yaml-cfn');

const DEFAULT_TEMPLATE_PATH = path.join(process.cwd(), 'template.yml');

function getTemplate(templatePath = DEFAULT_TEMPLATE_PATH) {
    const templateFileExists = fs.existsSync(templatePath);

    if (!templateFileExists) {
        throw new Error('TEMPLATE_FILE_NOT_FOUND');
    }

    const templateString = fs.readFileSync(templatePath, { encoding: 'utf8' });

    return yamlParse(templateString);
}

module.exports = {
    DEFAULT_TEMPLATE_PATH,
    getTemplate,
};
