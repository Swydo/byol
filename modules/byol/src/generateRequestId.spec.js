const { describe, it } = require('mocha');
const { expect } = require('chai');
const { generateRequestId } = require('./generateRequestId');

describe('generateRequestId', function () {
    it('generates random UUIDs', function () {
        const uuids = [
            generateRequestId(),
            generateRequestId(),
        ];

        uuids.forEach((uuid) => {
            expect(uuid).to.be.a('string').with.length(36);
        });

        expect(uuids[0]).to.not.equal(uuids[1]);
    });
});
