const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

async function handler() {
    const iniCredentials = new AWS.SharedIniFileCredentials();

    return {
        iniCredentials,
        region: AWS.config.region,
    };
}

module.exports = {
    handler,
};
