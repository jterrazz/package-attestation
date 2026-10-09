import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('message', () => {
    test('a message carries the canonical digest, the date in unix seconds and the revision chain', async () => {
        // Given - a consumer building messages for one article under each kind of date and revision
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/consumer/'))
            .exec('message.mjs');

        // Then - every message, and the signature the Hardhat wallet takes over it
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            versions: {"CANONICAL_VERSION":1,"NO_PRIOR_ATTESTATION":"0x0000000000000000000000000000000000000000000000000000000000000000","SCHEMA_VERSION":1}
            a Date: {"claims":{"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800n","revision":1,"slug":"hello-world"},"schemaVersion":1,"subject":{"contentDigest":"0xd2d62011d0490067d3250f2b34e65c9397cabe2bd6dc5081129e3e7408c9e8c2","locale":"en","title":"Hello World"}}
            unix seconds, a fraction dropped: {"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800n","revision":1,"slug":"hello-world"}
            a bigint: {"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800n","revision":1,"slug":"hello-world"}
            a millisecond past the second: {"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800n","revision":1,"slug":"hello-world"}
            a second revision: {"priorAttestation":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","publishedAt":"1778284800n","revision":2,"slug":"hello-world"}
            LF and CRLF content: {"crlf":"0x82d9cea061666a99f9dbf919e2dc6288ce7da4f7eba71997c0ae3af46f0732bb","lf":"0x82d9cea061666a99f9dbf919e2dc6288ce7da4f7eba71997c0ae3af46f0732bb"}
            signed: {"signature":"0xcc3d204c1a4dbd1b4f45c1784f37b907eeae8d11323c88824a6409b7fd4dbfaf11eac61445c99cd4135e861e5e13d61de5bbfe754d804538a1ab5ad5c0b3d0171c","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
            signed in two steps: {"claims":{"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800n","revision":1,"slug":"hello-world"},"schemaVersion":1,"subject":{"contentDigest":"0xd2d62011d0490067d3250f2b34e65c9397cabe2bd6dc5081129e3e7408c9e8c2","locale":"en","title":"Hello World"},"signature":"0xcc3d204c1a4dbd1b4f45c1784f37b907eeae8d11323c88824a6409b7fd4dbfaf11eac61445c99cd4135e861e5e13d61de5bbfe754d804538a1ab5ad5c0b3d0171c","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
        `);
    });
});
