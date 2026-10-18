import { hashTypedData } from 'viem';
import { describe, expect, test } from 'vitest';

import {
    ATTESTATION_DOMAIN_V1,
    ATTESTATION_PRIMARY_TYPE,
    ATTESTATION_TYPES_V1,
    NO_PRIOR_ATTESTATION,
} from '../../../src/primitives/eip712-schema.js';
import { integration } from '../integration.specification.js';

// invariant: both goldens are frozen: a struct renamed, a field reordered or a type widened moves the digest every v1 signature was taken over.
describe('schema', () => {
    test('the v1 type table is exactly the shape the signature hashes', async () => {
        // Given - the type table the v1 schema declares
        const result = await integration.call(() => ATTESTATION_TYPES_V1);

        // Then - the three structs, their fields and their order
        expect(result.value).toMatch(
            {
                Attestation: [
                    {
                        name: 'schemaVersion',
                        type: 'uint16',
                    },
                    {
                        name: 'subject',
                        type: 'ArticleSubject',
                    },
                    {
                        name: 'claims',
                        type: 'ArticleClaims',
                    },
                ],
                ArticleClaims: [
                    {
                        name: 'slug',
                        type: 'string',
                    },
                    {
                        name: 'publishedAt',
                        type: 'uint64',
                    },
                    {
                        name: 'revision',
                        type: 'uint16',
                    },
                    {
                        name: 'priorAttestation',
                        type: 'bytes32',
                    },
                ],
                ArticleSubject: [
                    {
                        name: 'title',
                        type: 'string',
                    },
                    {
                        name: 'contentDigest',
                        type: 'bytes32',
                    },
                    {
                        name: 'locale',
                        type: 'string',
                    },
                ],
            },
            { frozen: true },
        );
        expect(result.error.text).toBe('');
    });

    test('a known message hashes, over the v1 domain, to the digest v1 pinned', async () => {
        // Given - a first revision hashed against the v1 domain, primary type and types
        const result = await integration.call(() =>
            hashTypedData({
                domain: ATTESTATION_DOMAIN_V1,
                message: {
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
                },
                primaryType: ATTESTATION_PRIMARY_TYPE,
                types: ATTESTATION_TYPES_V1,
            }),
        );

        // Then - the digest every v1 signature is taken over
        expect(result.value).toMatch(
            '0x393cbd82cafae3f3ff7b9ba4e9eb38b89e43e8c1ab428046d4ccb2cabf2c43b0',
            { frozen: true },
        );
        expect(result.error.text).toBe('');
    });
});
