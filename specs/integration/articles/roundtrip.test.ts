import { expect, test } from 'vitest';

import { createAttestation } from '../../../src/attestation/create.js';
import { parse, stringify, toStored } from '../../../src/attestation/serialize.js';
import { verifyAttestation } from '../../../src/attestation/verify.js';
import { testAccount } from '../../../src/attestation/wallet.fixtures.js';
import { integration } from '../integration.specification.js';

/**
 * Sign, write, read back, verify — over five article shapes, frozen.
 *
 * The record a golden holds IS what lands on disk beside an article, so a
 * rewrite would make the attestations already published there unverifiable:
 * each golden carries `{ frozen: true }`.
 */

const ARTICLES = [
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

test.each(ARTICLES)('$slug ($locale) survives the JSON storage roundtrip', async (article) => {
    // Given - the article signed, written as JSON, read back and verified
    const result = await integration.call(async () => {
        const signed = await createAttestation(
            {
                content: article.content,
                locale: article.locale,
                publishedAt: new Date('2026-05-09T00:00:00Z'),
                slug: article.slug,
                title: `Test article ${article.slug}`,
            },
            testAccount(),
        );
        const reloaded = parse(stringify(signed));

        return {
            record: toStored(reloaded),
            verdict: await verifyAttestation({
                attestation: reloaded,
                content: article.content,
            }),
        };
    });

    // Then - the stored record, and the signer the reloaded one verifies as
    expect(result.value).toMatch(`${article.slug}.json`, { frozen: true });
    await expect(result.error).toBeEmpty();
});
