const path = require('path');
const {
    describe,
    it,
    before,
    after,
} = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { invokeHandler } = require('./invokeHandler');
const { terminateWorkerPools } = require('./handlerWorkerPool');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('invokeHandler', function () {
    before(async function () {
        await terminateWorkerPools();
    });

    after(async function () {
        await terminateWorkerPools();
    });

    it('invokes an async handler', async function () {
        const result = await invokeHandler({
            handlerName: 'handler',
            indexPath: 'goodHandler.js',
            workingDirectory: path.resolve(__dirname, '../tests/assets'),
        });

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
    });

    it('invokes a non-async handler', async function () {
        const result = await invokeHandler({
            handlerName: 'handler',
            indexPath: 'goodCallbackHandler.js',
            workingDirectory: path.resolve(__dirname, '../tests/assets'),
        });

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
    });

    it('invokes the handler with the given event', async function () {
        const event = {
            foo: 'foo',
        };

        const result = await invokeHandler({
            handlerName: 'handler',
            indexPath: 'goodHandler.js',
            workingDirectory: path.resolve(__dirname, '../tests/assets'),
            event,
        });

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');

        const { args } = result;
        expect(args).to.be.an('array').with.length(2);
        expect(args[0]).to.deep.equal(event);
    });

    it('invokes the handler with the given environment variables', async function () {
        const environment = {
            FOO: 'FOO',
        };

        const result = await invokeHandler({
            handlerName: 'handler',
            indexPath: 'goodHandler.js',
            workingDirectory: path.resolve(__dirname, '../tests/assets'),
            environment,
        });

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');

        const { env } = result;
        expect(env).to.have.property('FOO', environment.FOO);
    });

    it('rejects when an error is thrown by an async handler', async function () {
        const errorMessage = 'FOO';

        const invokePromise = invokeHandler({
            handlerName: 'handler',
            indexPath: 'badHandler.js',
            workingDirectory: path.resolve(__dirname, '../tests/assets'),
            event: { message: errorMessage },
        });

        await expect(invokePromise).to.eventually.be.rejectedWith(errorMessage);
    });

    it('rejects when an error is returned by an non-async handler', async function () {
        const errorMessage = 'FOO';

        const invokePromise = invokeHandler({
            handlerName: 'handler',
            indexPath: 'badCallbackHandler.js',
            workingDirectory: path.resolve(__dirname, '../tests/assets'),
            event: { message: errorMessage },
        });

        await expect(invokePromise).to.eventually.be.rejectedWith(errorMessage);
    });

    it('rejects when the process dies unexpectedly', async function () {
        const errorMessage = 'FOO';

        const invokePromise = invokeHandler({
            handlerName: 'handler',
            indexPath: 'brokenHandler.js',
            workingDirectory: path.resolve(__dirname, '../tests/assets'),
            event: { message: errorMessage },
        });

        await expect(invokePromise).to.eventually.be.rejectedWith('ERROR');
    });

    it('rejects when the handler function can\'t be found', async function () {
        const errorMessage = 'FOO';

        const invokePromise = invokeHandler({
            indexPath: 'goodHandler.js',
            handlerName: 'foo',
            workingDirectory: path.resolve(__dirname, '../tests/assets'),
            event: { message: errorMessage },
        });

        await expect(invokePromise).to.eventually.be.rejectedWith('HANDLER_NOT_FOUND');
    });
});
