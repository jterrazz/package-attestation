import { expect, test } from 'vitest';

import { createAttestation } from '../../../src/attestation/create.js';
import { stringify } from '../../../src/attestation/serialize.js';
import { verifyAttestation } from '../../../src/attestation/verify.js';
import { testAccount } from '../../../src/attestation/wallet.fixtures.js';
import { integration } from '../integration.specification.js';

/**
 * The full pipeline, frozen against the Hardhat test wallet.
 *
 * Drift in any golden here means canonicalize, the EIP-712 schema or viem's
 * deterministic ECDSA changed — each of which breaks every attestation this
 * package ever published. Hence `{ frozen: true }` on all three.
 */

const GOLDEN_INPUT = {
    content: '# Architects of Inversion\n\nThe world that follows...\n',
    locale: 'en',
    // 2024-05-09T00:00:00Z, fixed for reproducibility.
    publishedAt: 1_715_212_800,
    slug: 'architects-of-inversion',
    title: 'Architects of Inversion',
};

test('the frozen article signs to the signature v1 pinned', async () => {
    // Given - the frozen article signed with the Hardhat test wallet
    const result = await integration.call(async () => {
        const signed = await createAttestation(GOLDEN_INPUT, testAccount());
        return {
            contentDigest: signed.subject.contentDigest,
            schemaVersion: signed.schemaVersion,
            signature: signed.signature,
            signerAddress: signed.signerAddress,
        };
    });

    // Then - the digest, the schema version, the signature and its signer
    expect(result.value).toMatch('signature.json', { frozen: true });
    await expect(result.error).toBeEmpty();
});

test('the frozen article serializes to the bytes a verifier reads back', async () => {
    // Given - the same attestation written the way it lands on disk
    const result = await integration.call(async () =>
        stringify(await createAttestation(GOLDEN_INPUT, testAccount())),
    );

    // Then - the JSON document, byte for byte
    expect(result.value).toMatch('serialized.txt', { frozen: true });
    await expect(result.error).toBeEmpty();
});

test('the frozen article still verifies against the content it was signed over', async () => {
    // Given - the attestation verified against its original content
    const result = await integration.call(
        async () =>
            await verifyAttestation({
                attestation: await createAttestation(GOLDEN_INPUT, testAccount()),
                content: GOLDEN_INPUT.content,
            }),
    );

    // Then - the verdict and the address the signature recovers to
    expect(result.value).toMatch('verified.json', { frozen: true });
    await expect(result.error).toBeEmpty();
});
