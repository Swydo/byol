const path = require('path');
const { describe, it } = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { invokeFunction } = require('./invokeFunction');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('invokeFunction', function () {
    it('invokes the async function\'s handler', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {
            foo: 'foo',
        };

        const result = await invokeFunction(
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

        const result = await invokeFunction(
            'GoodCallbackFunction',
            event,
            { templatePath },
        );

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
    });

    it('invokes the function\'s handler with the given event', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const event = {
            foo: 'foo',
        };

        const result = await invokeFunction(
            'GoodFunction',
            event,
            { templatePath },
        );

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');

        const { args } = result;
        expect(args).to.be.an('array').with.length(3);
        expect(args[0]).to.deep.equal(event);
    });

    it('invokes the function\'s handler with environment variables from file', async function () {
        const templatePath = path.resolve(__dirname, '../tests/assets/template.yml');
        const envPath = path.resolve(__dirname, '../tests/assets/goodEnv.json');
        const event = {};

        const result = await invokeFunction(
            'GoodFunction',
            event,
            { templatePath, envPath },
        );

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');

        const { env } = result;
        expect(env).to.have.property('FOO', 'FOO');
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

        await expect(invokePromise).to.eventually.be.rejectedWith('FORK_EXITED_UNEXPECTEDLY');
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
