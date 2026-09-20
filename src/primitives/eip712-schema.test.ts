import { describe, expect, test } from 'vitest';

import {
    ATTESTATION_DOMAIN_V1,
    ATTESTATION_PRIMARY_TYPE,
    NO_PRIOR_ATTESTATION,
} from './eip712-schema.js';

describe('the EIP-712 schema v1 — frozen contract', () => {
    test('domain has the exact frozen values', () => {
        expect(ATTESTATION_DOMAIN_V1).toStrictEqual({
            chainId: 1,
            name: 'jterrazz.com Article Attestation',
            version: '1',
        });
    });

    test('primary type is "Attestation"', () => {
        expect(ATTESTATION_PRIMARY_TYPE).toBe('Attestation');
    });

    test('the NO_PRIOR_ATTESTATION sentinel is 32 zero bytes', () => {
        expect(NO_PRIOR_ATTESTATION).toBe(`0x${'0'.repeat(64)}`);
    });
});
