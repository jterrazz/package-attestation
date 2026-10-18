import { file } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { createAttestation } from '../../../src/attestation/create.js';
import { stringify } from '../../../src/attestation/serialize.js';
import { verifyAttestation } from '../../../src/attestation/verify.js';
import { testAccount } from '../__setup__/wallet.js';
import { integration } from '../integration.specification.js';

// invariant: the three goldens are frozen: a drift means canonicalize, the EIP-712 schema or viem's deterministic ECDSA changed, each of which breaks every attestation ever published.
const FROZEN_ARTICLE = {
    content: '# Architects of Inversion\n\nThe world that follows...\n',
    locale: 'en',
    publishedAt: 1_715_212_800,
    slug: 'architects-of-inversion',
    title: 'Architects of Inversion',
};

describe('attestation', () => {
    test('the frozen article signs to the signature v1 pinned', async () => {
        // Given - the frozen article signed with the Hardhat test wallet
        const result = await integration.call(async () => {
            const signed = await createAttestation(FROZEN_ARTICLE, testAccount());
            return {
                contentDigest: signed.subject.contentDigest,
                schemaVersion: signed.schemaVersion,
                signature: signed.signature,
                signerAddress: signed.signerAddress,
            };
        });

        // Then - the digest, the schema version, the signature and its signer
        expect(result.value).toMatch(
            {
                contentDigest: '0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe',
                schemaVersion: 1,
                signature:
                    '0x8af1b32a9152bb527f0ae55f75aca7f84f88dd0fe60309eb669a1bfca9877b8b57fe3b6a04a06d9b94ab79c0dbd5a4d01d3a4680a33509d2d0c32d383e8db7b91b',
                signerAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            },
            { frozen: true },
        );
        expect(result.error.text).toBe('');
    });

    test('the frozen article serializes to the bytes a verifier reads back', async () => {
        // Given - the same attestation written the way it lands on disk
        const result = await integration.call(async () =>
            stringify(await createAttestation(FROZEN_ARTICLE, testAccount())),
        );

        // Then - the JSON document, byte for byte
        // checker-disable-next-line ground-shared-or-inline -- the subject is the file's bytes: its two-space indentation and its one trailing line break are the contract, which a value written in place would compare as JSON
        expect(result.value).toMatch(file('./__expected__/serialized.txt'), { frozen: true });
        expect(result.error.text).toBe('');
    });

    test('the frozen article still verifies against the content it was signed over', async () => {
        // Given - the attestation verified against its original content
        const result = await integration.call(
            async () =>
                await verifyAttestation({
                    attestation: await createAttestation(FROZEN_ARTICLE, testAccount()),
                    content: FROZEN_ARTICLE.content,
                }),
        );

        // Then - the verdict and the address the signature recovers to
        expect(result.value).toMatch(
            {
                ok: true,
                signerAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            },
            { frozen: true },
        );
        expect(result.error.text).toBe('');
    });
});
