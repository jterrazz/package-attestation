import { describe, expect, test } from 'vitest';

import { SCHEMA_VERSION } from '../index.js';
import { NO_PRIOR_ATTESTATION } from '../primitives/eip712-schema.js';
import { buildAttestationMessage, createAttestation, signAttestation } from './create.js';
import { TEST_ADDRESS, testAccount } from './wallet.fixtures.js';

const baseInput = {
    content: '# Hello\n\nWorld.',
    locale: 'en',
    publishedAt: new Date('2026-05-09T00:00:00Z'),
    slug: 'hello-world',
    title: 'Hello World',
};

describe('buildAttestationMessage', () => {
    test('embeds the canonical content digest', () => {
        const m = buildAttestationMessage(baseInput);
        expect(m.subject.contentDigest).toMatch(/^0x[0-9a-f]{64}$/u);
    });

    test('uses SCHEMA_VERSION', () => {
        expect(buildAttestationMessage(baseInput).schemaVersion).toBe(SCHEMA_VERSION);
    });

    test('defaults revision to 1 and priorAttestation to zero', () => {
        const m = buildAttestationMessage(baseInput);
        expect(m.claims.revision).toBe(1);
        expect(m.claims.priorAttestation).toBe(NO_PRIOR_ATTESTATION);
    });

    test('converts Date to unix seconds bigint', () => {
        const m = buildAttestationMessage(baseInput);
        // 2026-05-09T00:00:00Z = 1778284800
        expect(m.claims.publishedAt).toBe(1_778_284_800n);
    });

    test('accepts a number (unix seconds) directly', () => {
        const m = buildAttestationMessage({ ...baseInput, publishedAt: 1_778_284_800 });
        expect(m.claims.publishedAt).toBe(1_778_284_800n);
    });

    test('accepts a bigint directly', () => {
        const m = buildAttestationMessage({ ...baseInput, publishedAt: 1_778_284_800n });
        expect(m.claims.publishedAt).toBe(1_778_284_800n);
    });

    test('produces an identical digest for content that differs only in line endings', () => {
        const lf = buildAttestationMessage({ ...baseInput, content: 'line\nline' });
        const crlf = buildAttestationMessage({ ...baseInput, content: 'line\r\nline' });
        expect(lf.subject.contentDigest).toBe(crlf.subject.contentDigest);
    });
});

describe('signAttestation', () => {
    test('produces a 65-byte hex signature', async () => {
        const account = testAccount();
        const message = buildAttestationMessage(baseInput);
        const signed = await signAttestation(message, account);

        expect(signed.signature).toMatch(/^0x[0-9a-f]{130}$/u);
        expect(signed.signerAddress).toBe(TEST_ADDRESS);
    });

    test('is deterministic for the same message and key', async () => {
        const account = testAccount();
        const message = buildAttestationMessage(baseInput);
        const a = await signAttestation(message, account);
        const b = await signAttestation(message, account);
        expect(a.signature).toBe(b.signature);
    });
});

describe('createAttestation', () => {
    test('combines build + sign in one call', async () => {
        const account = testAccount();
        const signed = await createAttestation(baseInput, account);
        expect(signed.signerAddress).toBe(TEST_ADDRESS);
        expect(signed.signature).toMatch(/^0x[0-9a-f]{130}$/u);
    });
});

describe('createAttestation — the revision chain', () => {
    test('carries an explicit revision and the attestation it follows', async () => {
        // Given - a second version signed against the attestation it revises
        const account = testAccount();
        const prior = `0x${'aa'.repeat(32)}` as const;

        const second = await createAttestation(
            {
                ...baseInput,
                content: 'second version',
                priorAttestation: prior,
                revision: 2,
            },
            account,
        );

        // Then - the claims carry both, rather than the defaults
        expect(second.claims.revision).toBe(2);
        expect(second.claims.priorAttestation).toBe(prior);
    });
});
