import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('from-url', () => {
    test('a published article is verified from its URL, each leg reported by its state', async () => {
        // Given - a consumer verifying an article through a fetch double, its pages and its verifier varied case by case
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/consumer/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .exec('from-url.mjs');

        // Then - one report per case, and the URLs each one asked for
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            no verifier named: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"kind":"skipped","reason":"no-ots-file"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            a trailing slash and a query: {"authorship":{"details":"GET https://example.com/articles/hello/proof.json?ref=feed: HTTP 404","error":"fetch","kind":"failed"},"date":{"details":"GET https://example.com/articles/hello/proof.json?ref=feed: HTTP 404","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json?ref=feed
            the Bitcoin leg skipped: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"kind":"skipped","reason":"opt-out"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            an empty verifier: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"kind":"skipped","reason":"no-ots-file"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            verified on Bitcoin: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"bitcoinTime":"2026-05-09T14:51:40.000Z","kind":"verified"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            pending its block: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"kind":"pending"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a proof refused: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"merkle root differs","error":"invalid-proof","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a verifier down: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"GET https://example.com/verify-ots.json: HTTP 404","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a verifier answering no verdict: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"GET https://example.com/verify-ots.json: not an OpenTimestamps verdict","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a digest the verifier refuses: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"error":"digest-mismatch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a verifier neither passing nor refusing: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"GET https://example.com/verify-ots.json: not an OpenTimestamps verdict","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a refusal whose details are no text: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"GET https://example.com/verify-ots.json: not an OpenTimestamps verdict","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a verifier named by a number: {"authorship":{"details":"GET https://example.com/articles/hello/proof.json: not a proof manifest","error":"fetch","kind":"failed"},"date":{"details":"GET https://example.com/articles/hello/proof.json: not a proof manifest","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json
            a verifier with an unknown reason: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"GET https://example.com/verify-ots.json: not an OpenTimestamps verdict","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a verifier passing with no time: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"GET https://example.com/verify-ots.json: not an OpenTimestamps verdict","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a verifier refusing with no reason: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"GET https://example.com/verify-ots.json: not an OpenTimestamps verdict","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a verifier answering null: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"GET https://example.com/verify-ots.json: not an OpenTimestamps verdict","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            a verifier unreachable: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"details":"fetch failed","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json /verify-ots.json
            tampered markdown: {"authorship":{"error":"content-mismatch","kind":"failed"},"date":{"kind":"skipped","reason":"opt-out"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            no manifest: {"authorship":{"details":"GET https://example.com/articles/hello/proof.json: HTTP 404","error":"fetch","kind":"failed"},"date":{"details":"GET https://example.com/articles/hello/proof.json: HTTP 404","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json
            a manifest that is none: {"authorship":{"details":"GET https://example.com/articles/hello/proof.json: not a proof manifest","error":"fetch","kind":"failed"},"date":{"details":"GET https://example.com/articles/hello/proof.json: not a proof manifest","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json
            no content: {"authorship":{"details":"GET https://example.com/articles/hello/en.md: HTTP 404","error":"fetch","kind":"failed"},"date":{"details":"GET https://example.com/articles/hello/en.md: HTTP 404","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            no attestation: {"authorship":{"details":"GET https://example.com/articles/hello/en.attestation.json: HTTP 404","error":"fetch","kind":"failed"},"date":{"details":"GET https://example.com/articles/hello/en.attestation.json: HTTP 404","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            an attestation that is none: {"authorship":{"details":"Not a stored attestation: a member is missing or of the wrong type.","error":"fetch","kind":"failed"},"date":{"details":"Not a stored attestation: a member is missing or of the wrong type.","error":"fetch","kind":"failed"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            a thrown string: {"authorship":{"details":"offline","error":"fetch","kind":"failed"},"date":{"details":"offline","error":"fetch","kind":"failed"}}
              asked: 
            through the global fetch: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"kind":"skipped","reason":"no-ots-file"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            a path read from the page: {"authorship":{"kind":"verified","signedAt":"2026-05-09T00:00:00.000Z","signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"date":{"kind":"skipped","reason":"no-ots-file"}}
              asked: /articles/hello/proof.json /articles/hello/en.md /articles/hello/en.attestation.json
            ens asked https://ethereum-rpc.publicnode.com/ POST
            ens asked https://ethereum-rpc.publicnode.com/ POST
            ens asked https://ethereum-rpc.publicnode.com/ POST
            ens asked https://ethereum-rpc.publicnode.com/ POST
            an ENS name, offline: null
        `);
    });
});
