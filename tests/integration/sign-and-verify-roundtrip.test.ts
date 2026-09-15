import { describe, expect, test } from 'vitest';

import { createAttestation } from '../../src/attestation/create.js';
import { parse, stringify } from '../../src/attestation/serialize.js';
import { type SignedAttestation } from '../../src/attestation/types.js';
import { verifyAttestation } from '../../src/attestation/verify.js';
import { TEST_ADDRESS, testAccount } from '../setup/test-wallet.js';

const articles = [
    { content: 'plain ASCII article body.', locale: 'en', slug: 'plain' },
    { content: 'avec accents éàùç et 🦊', locale: 'fr', slug: 'unicode' },
    { content: '日本語の記事です\n\n二段落目', locale: 'ja', slug: 'cjk' },
    {
        content: '```js\nconst x = 1;\n```\n\n[link](https://example.com)',
        locale: 'en',
        slug: 'markdown-features',
    },
    { content: 'a\r\nb\r\nc', locale: 'en', slug: 'crlf-input' },
] as const;

describe('full sign → store → load → verify roundtrip', () => {
    test.each(articles)('roundtrip survives JSON storage for $slug ($locale)', async (a) => {
        const account = testAccount();

        const signed = await createAttestation(
            {
                content: a.content,
                locale: a.locale,
                publishedAt: new Date('2026-05-09T00:00:00Z'),
                slug: a.slug,
                title: `Test article ${a.slug}`,
            },
            account,
        );

        const onDisk = stringify(signed);
        const reloaded = parse(onDisk);

        const result = await verifyAttestation({
            attestation: reloaded,
            content: a.content,
        });

        expect(result.ok).toBeTruthy();
        if (result.ok) {
            expect(result.signerAddress).toBe(TEST_ADDRESS);
        }
    });
});

describe('full pipeline — negative cases', () => {
    const sample = {
        content: 'Any article content',
        locale: 'en',
        publishedAt: new Date('2026-05-09T00:00:00Z'),
        slug: 'any',
        title: 'Any',
    };

    test('rejects after a single byte mutation in content', async () => {
        const account = testAccount();
        const signed = await createAttestation(sample, account);

        const result = await verifyAttestation({
            attestation: signed,
            // One byte (case) flipped mid-string.
            content: sample.content.replace('Any', 'any'),
        });

        expect(result.ok).toBeFalsy();
        if (!result.ok) {
            expect(result.error.kind).toBe('content-mismatch');
        }
    });

    test('rejects after tampering with the title', async () => {
        const account = testAccount();
        const signed = await createAttestation(sample, account);

        const tampered = {
            ...signed,
            subject: { ...signed.subject, title: 'Different Title' },
        };

        const result = await verifyAttestation({
            attestation: tampered,
            content: sample.content,
        });

        expect(result.ok).toBeFalsy();
        if (!result.ok) {
            expect(result.error.kind).toBe('signer-mismatch');
        }
    });

    test('rejects after tampering with the publishedAt timestamp', async () => {
        const account = testAccount();
        const signed = await createAttestation(sample, account);

        const tampered = {
            ...signed,
            claims: { ...signed.claims, publishedAt: signed.claims.publishedAt + 1n },
        };

        const result = await verifyAttestation({
            attestation: tampered,
            content: sample.content,
        });

        expect(result.ok).toBeFalsy();
        if (!result.ok) {
            expect(result.error.kind).toBe('signer-mismatch');
        }
    });
});

// The EIP-712 message hash v2 should reference; a non-zero placeholder is
// Enough to prove the chain links.
const PRIOR_REF = `0x${'aa'.repeat(32)}` as const;

async function signRevisionPair(): Promise<{
    v1: SignedAttestation;
    v2: SignedAttestation;
}> {
    const account = testAccount();

    const v1 = await createAttestation(
        {
            content: 'first version',
            locale: 'en',
            publishedAt: new Date('2026-05-09T00:00:00Z'),
            slug: 'evolving',
            title: 'Evolving',
        },
        account,
    );

    const v2 = await createAttestation(
        {
            content: 'second version',
            locale: 'en',
            priorAttestation: PRIOR_REF,
            publishedAt: new Date('2026-05-10T00:00:00Z'),
            revision: 2,
            slug: 'evolving',
            title: 'Evolving',
        },
        account,
    );

    return { v1, v2 };
}

describe('revision chain', () => {
    test('chains a revision via priorAttestation', async () => {
        const { v1, v2 } = await signRevisionPair();

        expect(v1.claims.revision).toBe(1);
        expect(v1.claims.priorAttestation).toBe(`0x${'0'.repeat(64)}`);
        expect(v2.claims.revision).toBe(2);
        expect(v2.claims.priorAttestation).toBe(PRIOR_REF);
    });

    test('verifies each revision against its own content', async () => {
        const { v1, v2 } = await signRevisionPair();

        const firstResult = await verifyAttestation({
            attestation: v1,
            content: 'first version',
        });
        const secondResult = await verifyAttestation({
            attestation: v2,
            content: 'second version',
        });

        expect(firstResult.ok).toBeTruthy();
        expect(secondResult.ok).toBeTruthy();
    });
});
