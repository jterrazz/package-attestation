import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { createAttestation } from '../../../src/attestation/create.js';
import { parse, stringify } from '../../../src/attestation/serialize.js';
import { verifyAttestation } from '../../../src/attestation/verify.js';
import { testAccount } from '../../../src/attestation/wallet.fixtures.js';
import { canonicalize } from '../../../src/primitives/canonicalize.js';
import { integration } from '../integration.specification.js';

/**
 * The full pipeline against every real article of a sibling jterrazz-web
 * checkout — the case where an exotic character in a freshly written article
 * would break canonicalization or signing.
 *
 * The content is not this repository's, so no golden can pin it: the oracle
 * is that the pipeline closes on every file found. Signs with the Hardhat
 * test key — no real signature is produced.
 */

const CONTENT_DIR = join(process.cwd(), '..', '..', 'content');

type ArticleFile = {
    folder: string;
    locale: 'en' | 'fr';
    path: string;
};

function discoverArticles(): ArticleFile[] {
    let entries: string[];
    try {
        entries = readdirSync(CONTENT_DIR);
    } catch {
        return [];
    }

    const out: ArticleFile[] = [];
    for (const folder of entries) {
        const folderPath = join(CONTENT_DIR, folder);
        if (!statSync(folderPath).isDirectory()) {
            continue;
        }
        for (const locale of ['en', 'fr'] as const) {
            const filePath = join(folderPath, `${locale}.md`);
            try {
                statSync(filePath);
                out.push({ folder, locale, path: filePath });
            } catch {
                // Not present, skip
            }
        }
    }
    return out;
}

const ARTICLES = discoverArticles();

describe.skipIf(ARTICLES.length === 0)('every real article passes the full pipeline', () => {
    test.each(ARTICLES)(
        'canonicalize → sign → store → verify closes on $folder ($locale)',
        async ({ locale, folder, path }) => {
            // Given - one real article read off the sibling checkout
            const result = await integration.call(async () => {
                const content = readFileSync(path, 'utf8');
                const signed = await createAttestation(
                    {
                        content,
                        locale,
                        publishedAt: new Date('2026-01-01T00:00:00Z'),
                        slug: folder.toLowerCase().replaceAll(/\s+/gu, '-'),
                        title: folder,
                    },
                    testAccount(),
                );

                return {
                    canonicalBytes: canonicalize(content).length,
                    lossless: stringify(parse(stringify(signed))) === stringify(signed),
                    verdict: await verifyAttestation({ attestation: signed, content }),
                };
            });

            // Then - non-empty canonical bytes, a lossless roundtrip, a valid signature
            expect(result.value.value.canonicalBytes).toBeGreaterThan(0);
            expect(result.value.value.lossless).toBe(true);
            expect(result.value.value.verdict.ok).toBe(true);
            await expect(result.error).toBeEmpty();
        },
    );
});
