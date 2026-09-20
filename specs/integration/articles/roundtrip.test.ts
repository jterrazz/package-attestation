import { describe, expect, test } from 'vitest';

import { createAttestation } from '../../../src/attestation/create.js';
import { parse, stringify } from '../../../src/attestation/serialize.js';
import { verifyAttestation } from '../../../src/attestation/verify.js';
import { TEST_ADDRESS, testAccount } from '../../../src/attestation/wallet.fixtures.js';

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

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.signerAddress).toBe(TEST_ADDRESS);
        }
    });
});
