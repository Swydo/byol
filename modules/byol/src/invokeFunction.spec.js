const path = require('path');
const {
    describe,
    it,
    before,
    after,
} = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { invokeFunction } = require('./invokeFunction');
const { terminateWorkerPools } = require('./handlerWorkerPool');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('invokeFunction', function () {
    before(async function () {
        await terminateWorkerPools();
    });

    after(async function () {
        await terminateWorkerPools();
    });

    it('invokes the async function\'s handler', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {
            foo: 'foo',
        };

        const { result } = await invokeFunction(
            'GoodFunction',
            event,
            { templatePath },
        );

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
    });

    it('invokes the non-async function\'s handler', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {
            foo: 'foo',
        };

        const { result, invocationType } = await invokeFunction(
            'GoodCallbackFunction',
            event,
            { templatePath },
        );

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
        expect(invocationType).to.equal('RequestResponse');
    });

    it('invokes the function\'s handler with the given event', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {
            foo: 'foo',
        };

        const { result, invocationType } = await invokeFunction(
            'GoodFunction',
            event,
            { templatePath },
        );

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
        expect(invocationType).to.equal('RequestResponse');

        const { args } = result;
        expect(args).to.be.an('array').with.length(2);
        expect(args[0]).to.deep.equal(event);
    });

    it('invokes a nested function\'s handler', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/nested-template.yml');
        const event = {
            foo: 'foo',
        };

        const { result, invocationType } = await invokeFunction(
            'GoodFunction',
            event,
            { templatePath },
        );

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
        expect(invocationType).to.equal('RequestResponse');

        const { args } = result;
        expect(args).to.be.an('array').with.length(2);
        expect(args[0]).to.deep.equal(event);
    });

    it('invokes the function\'s handler with environment variables from file', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const envPath = path.resolve(__dirname, '../tests/assets/goodEnv.json');
        const event = {};

        const { result, invocationType } = await invokeFunction(
            'GoodFunction',
            event,
            { templatePath, envPath },
        );

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
        expect(invocationType).to.equal('RequestResponse');

        const { env } = result;
        expect(env).to.have.property('FOO', 'FOO');
    });

    it('invokes the function\'s handler with environment variables from the AWS profile', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const envPath = path.resolve(__dirname, '../tests/assets/goodEnv.json');
        const profile = 'bar-profile';
        const event = {};

        const { result } = await invokeFunction(
            'GoodAwsFunction',
            event,
            { templatePath, envPath, profile },
        );

        expect(result).to.have.property('iniCredentials');

        const { iniCredentials } = result;
        expect(iniCredentials).to.have.property('profile', profile);
    });

    it('invokes the function\'s handler with environment variables for the specified region', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const envPath = path.resolve(__dirname, '../tests/assets/goodEnv.json');
        const region = 'foo-region-1';
        const event = {};

        const { result } = await invokeFunction(
            'GoodAwsFunction',
            event,
            { templatePath, envPath, region },
        );

        expect(result).to.have.property('region', region);
    });

    it('asynchronously invokes the function\'s handler', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {
            foo: 'foo',
        };

        const { invocationType } = await invokeFunction(
            'GoodAcyncFunction',
            event,
            { templatePath },
        );

        expect(invocationType).to.equal('Event');
    });

    it('rejects when an error is thrown by the handler', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {
            message: 'FOO',
        };

        const invokePromise = invokeFunction(
            'BadFunction',
            event,
            { templatePath },
        );

        await expect(invokePromise).to.eventually.be.rejectedWith(event.message);
    });

    it('rejects when an error is thrown by the handler', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {
            message: 'FOO',
        };

        const invokePromise = invokeFunction(
            'BadCallbackFunction',
            event,
            { templatePath },
        );

        await expect(invokePromise).to.eventually.be.rejectedWith(event.message);
    });

    it('rejects when the process dies unexpectedly', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {};

        const invokePromise = invokeFunction(
            'BrokenFunction',
            event,
            { templatePath },
        );

        await expect(invokePromise).to.eventually.be.rejectedWith('ERROR');
    });

    it('rejects when the function can\'t be found', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {};

        const invokePromise = invokeFunction(
            'FooFunction',
            event,
            { templatePath },
        );

        await expect(invokePromise).to.eventually.be.rejectedWith('FUNCTION_NOT_DEFINED');
    });

    it('rejects when the environment file is invalid', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const envPath = path.resolve(__dirname, '../tests/assets/badEnv.json');
        const event = {};

        const invokePromise = invokeFunction(
            'GoodFunction',
            event,
            { templatePath, envPath },
        );

        await expect(invokePromise).to.eventually.be.rejectedWith('MALFORMED_ENV_FILE');
    });
});
