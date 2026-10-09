import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('storage', () => {
    test('an attestation is written as JSON and read back whole, and a document that is none is refused', async () => {
        // Given - a consumer writing one attestation, reading it back, then reading documents each missing a member
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/consumer/'))
            .exec('storage.mjs');

        // Then - the document, the record both ways, and one refusal per malformed document
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            {
              "claims": {
                "priorAttestation": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "publishedAt": "1778284800",
                "revision": 1,
                "slug": "hello-world"
              },
              "schemaVersion": 1,
              "signature": "0xcc3d204c1a4dbd1b4f45c1784f37b907eeae8d11323c88824a6409b7fd4dbfaf11eac61445c99cd4135e861e5e13d61de5bbfe754d804538a1ab5ad5c0b3d0171c",
              "signerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
              "subject": {
                "contentDigest": "0xd2d62011d0490067d3250f2b34e65c9397cabe2bd6dc5081129e3e7408c9e8c2",
                "locale": "en",
                "title": "Hello World"
              }
            }
            stored: {"claims":{"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800","revision":1,"slug":"hello-world"},"schemaVersion":1,"signature":"0xcc3d204c1a4dbd1b4f45c1784f37b907eeae8d11323c88824a6409b7fd4dbfaf11eac61445c99cd4135e861e5e13d61de5bbfe754d804538a1ab5ad5c0b3d0171c","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","subject":{"contentDigest":"0xd2d62011d0490067d3250f2b34e65c9397cabe2bd6dc5081129e3e7408c9e8c2","locale":"en","title":"Hello World"}}
            restored: {"claims":{"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800n","revision":1,"slug":"hello-world"},"schemaVersion":1,"signature":"0xcc3d204c1a4dbd1b4f45c1784f37b907eeae8d11323c88824a6409b7fd4dbfaf11eac61445c99cd4135e861e5e13d61de5bbfe754d804538a1ab5ad5c0b3d0171c","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","subject":{"contentDigest":"0xd2d62011d0490067d3250f2b34e65c9397cabe2bd6dc5081129e3e7408c9e8c2","locale":"en","title":"Hello World"}}
            parsed: {"claims":{"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800n","revision":1,"slug":"hello-world"},"schemaVersion":1,"signature":"0xcc3d204c1a4dbd1b4f45c1784f37b907eeae8d11323c88824a6409b7fd4dbfaf11eac61445c99cd4135e861e5e13d61de5bbfe754d804538a1ab5ad5c0b3d0171c","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","subject":{"contentDigest":"0xd2d62011d0490067d3250f2b34e65c9397cabe2bd6dc5081129e3e7408c9e8c2","locale":"en","title":"Hello World"}}
            null: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            a number: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            schemaVersion as text: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no schemaVersion: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no signature: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no signerAddress: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no subject: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no claims: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no subject.title: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no subject.contentDigest: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no subject.locale: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no claims.slug: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no claims.publishedAt: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no claims.revision: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            no claims.priorAttestation: TypeError: Not a stored attestation: a member is missing or of the wrong type.
            an extra member, left out: ["claims","schemaVersion","signature","signerAddress","subject"]
        `);
    });
});
