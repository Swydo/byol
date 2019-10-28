const path = require('path');
const { describe, it } = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { invokeHandler } = require('./invokeHandler');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('invokeHandler', function () {
    it('invokes an async handler', async function () {
        const absoluteIndexPath = path.resolve(__dirname, '../tests/assets/goodHandler.js');

        const result = await invokeHandler({
            absoluteIndexPath,
            handlerName: 'handler',
        });

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
    });

    it('invokes a non-async handler', async function () {
        const absoluteIndexPath = path.resolve(__dirname, '../tests/assets/goodCallbackHandler.js');

        const result = await invokeHandler({
            absoluteIndexPath,
            handlerName: 'handler',
        });

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');
    });

    it('invokes the handler with the given event', async function () {
        const absoluteIndexPath = path.resolve(__dirname, '../tests/assets/goodHandler.js');
        const event = {
            foo: 'foo',
        };

        const result = await invokeHandler({
            absoluteIndexPath,
            handlerName: 'handler',
            event,
        });

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');

        const { args } = result;
        expect(args).to.be.an('array').with.length(3);
        expect(args[0]).to.deep.equal(event);
    });

    it('invokes the handler with the given environment variables', async function () {
        const absoluteIndexPath = path.resolve(__dirname, '../tests/assets/goodHandler.js');
        const environment = {
            FOO: 'FOO',
        };

        const result = await invokeHandler({
            absoluteIndexPath,
            handlerName: 'handler',
            environment,
        });

        expect(result).to.be.an('object');
        expect(result).to.have.property('env');
        expect(result).to.have.property('args');

        const { env } = result;
        expect(env).to.have.property('FOO', environment.FOO);
    });

    it('rejects when an error is thrown by an async handler', async function () {
        const absoluteIndexPath = path.resolve(__dirname, '../tests/assets/badHandler.js');
        const errorMessage = 'FOO';

        const invokePromise = invokeHandler({
            absoluteIndexPath,
            handlerName: 'handler',
            event: { message: errorMessage },
        });

        await expect(invokePromise).to.eventually.be.rejectedWith(errorMessage);
    });

    it('rejects when an error is returned by an non-async handler', async function () {
        const absoluteIndexPath = path.resolve(__dirname, '../tests/assets/badCallbackHandler.js');
        const errorMessage = 'FOO';

        const invokePromise = invokeHandler({
            absoluteIndexPath,
            handlerName: 'handler',
            event: { message: errorMessage },
        });

        await expect(invokePromise).to.eventually.be.rejectedWith(errorMessage);
    });

    it('rejects when the process dies unexpectedly', async function () {
        const absoluteIndexPath = path.resolve(__dirname, '../tests/assets/brokenHandler.js');
        const errorMessage = 'FOO';

        const invokePromise = invokeHandler({
            absoluteIndexPath,
            handlerName: 'handler',
            event: { message: errorMessage },
        });

        await expect(invokePromise).to.eventually.be.rejectedWith('FORK_EXITED_UNEXPECTEDLY');
    });

    it('rejects when the handler function can\'t be found', async function () {
        const absoluteIndexPath = path.resolve(__dirname, '../tests/assets/goodHandler.js');
        const errorMessage = 'FOO';

        const invokePromise = invokeHandler({
            absoluteIndexPath,
            handlerName: 'foo',
            event: { message: errorMessage },
        });

        await expect(invokePromise).to.eventually.be.rejectedWith('HANDLER_NOT_FOUND');
    });
});
