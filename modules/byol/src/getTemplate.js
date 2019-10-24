const fs = require('fs');
const path = require('path');
const { yamlParse } = require('yaml-cfn');

function getTemplate(templatePath = path.join(process.cwd(), 'template.yml')) {
    const templateFileExists = fs.existsSync(templatePath);

    if (!templateFileExists) {
        throw new Error('TEMPLATE_FILE_NOT_FOUND');
    }

    const templateString = fs.readFileSync(templatePath, { encoding: 'utf8' });

    return yamlParse(templateString);
}

module.exports = {
    getTemplate,
};
