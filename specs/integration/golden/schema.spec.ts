import { hashTypedData } from 'viem';
import { expect, test } from 'vitest';

import {
    ATTESTATION_DOMAIN_V1,
    ATTESTATION_PRIMARY_TYPE,
    ATTESTATION_TYPES_V1,
    NO_PRIOR_ATTESTATION,
} from '../../../src/primitives/eip712-schema.js';
import type { AttestationMessage } from '../../../src/primitives/eip712-schema.js';
import { integration } from '../integration.specification.js';

/**
 * The EIP-712 schema v1, frozen. A struct renamed, a field reordered or a
 * type widened changes the digest every v1 signature was taken over, so both
 * goldens carry `{ frozen: true }`.
 */

const KNOWN_MESSAGE: AttestationMessage = {
    claims: {
        priorAttestation: NO_PRIOR_ATTESTATION,
        publishedAt: 1_715_212_800n,
        revision: 1,
        slug: 'architects-of-inversion',
    },
    schemaVersion: 1,
    subject: {
        contentDigest: `0x${'a'.repeat(64)}`,
        locale: 'en',
        title: 'Architects of Inversion',
    },
};

test('the v1 type table is exactly the shape the signature hashes', async () => {
    // Given - the type table the v1 schema declares
    const result = await integration.call(() => ATTESTATION_TYPES_V1);

    // Then - the three structs, their fields and their order
    expect(result.value).toMatch('eip712-types.json', { frozen: true });
    await expect(result.error).toBeEmpty();
});

test('a known message hashes to the digest v1 pinned', async () => {
    // Given - the known message hashed against the v1 domain and types
    const result = await integration.call(() =>
        hashTypedData({
            domain: ATTESTATION_DOMAIN_V1,
            message: KNOWN_MESSAGE,
            primaryType: ATTESTATION_PRIMARY_TYPE,
            types: ATTESTATION_TYPES_V1,
        }),
    );

    // Then - the digest every v1 signature is taken over
    expect(result.value).toMatch('eip712-digest.txt', { frozen: true });
    await expect(result.error).toBeEmpty();
});
