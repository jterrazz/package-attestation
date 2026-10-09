import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('verify', () => {
    test('a signed attestation verifies, and every tampering is refused by its kind', async () => {
        // Given - a consumer verifying one attestation as signed, then altered field by field
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/consumer/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .exec('verify.mjs');

        // Then - one verdict per case
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            as signed: {"ok":true,"signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
            as signed, from the browser entry: {"ok":true,"signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
            CRLF content: {"ok":true,"signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
            a byte lost: {"error":{"actualDigest":"0x10bfc83d9cd2ff7144b22fd0448e0ecae86e0fe9878ce9bd1470122bc13e64c4","expectedDigest":"0xd2d62011d0490067d3250f2b34e65c9397cabe2bd6dc5081129e3e7408c9e8c2","kind":"content-mismatch"},"ok":false}
            a declared signer in upper case: {"ok":true,"signerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
            another declared signer: {"error":{"declared":"0x0000000000000000000000000000000000000001","kind":"signer-mismatch","recovered":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"ok":false}
            a zeroed signature: {"error":{"kind":"invalid-signature","reason":"expected valid r: 1 <= n < 115792089237316195423570985008687907852837564279074904382605163141518161494337, got 0"},"ok":false}
            a truncated signature: {"error":{"kind":"invalid-signature","reason":"invalid signature length"},"ok":false}
            a slug swapped: {"error":{"declared":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","kind":"signer-mismatch","recovered":"0xbeeCc85379277cDd06C5FB5035BF662EaEffd916"},"ok":false}
            a title rewritten: {"error":{"declared":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","kind":"signer-mismatch","recovered":"0xb2b08D473Af74d3d778F7f003d33bf830db2f6bD"},"ok":false}
            a date moved a second: {"error":{"declared":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","kind":"signer-mismatch","recovered":"0x5154f688Aa049872ee7FF2A4be350742481Db89F"},"ok":false}
            a schema from the future: {"error":{"kind":"schema-version-unsupported","version":999},"ok":false}
        `);
    });
});
