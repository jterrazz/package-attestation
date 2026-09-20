import { describe, expect, test } from 'vitest';

import { createAttestation } from './create.js';
import { fromStored, parse, stringify, toStored } from './serialize.js';
import { testAccount } from './wallet.fixtures.js';

const baseInput = {
    content: '# Hello\n\nWorld.',
    locale: 'en',
    publishedAt: new Date('2026-05-09T00:00:00Z'),
    slug: 'hello-world',
    title: 'Hello World',
};

describe('serialize — roundtrip', () => {
    test('toStored → fromStored returns a deeply equal SignedAttestation', async () => {
        const account = testAccount();
        const signed = await createAttestation(baseInput, account);

        const stored = toStored(signed);
        const restored = fromStored(stored);

        expect(restored).toStrictEqual(signed);
    });

    test('stringify → parse roundtrip is JSON-stable and lossless', async () => {
        const account = testAccount();
        const signed = await createAttestation(baseInput, account);

        const json = stringify(signed);
        const parsed = parse(json);

        expect(parsed).toStrictEqual(signed);
    });

    test('produces JSON ending in a single trailing newline', async () => {
        const account = testAccount();
        const signed = await createAttestation(baseInput, account);

        const json = stringify(signed);
        expect(json.endsWith('\n')).toBe(true);
        expect(json.endsWith('\n\n')).toBe(false);
    });

    test('stringifies publishedAt as a string (JSON has no bigint)', async () => {
        const account = testAccount();
        const signed = await createAttestation(baseInput, account);

        const json = stringify(signed);
        const parsed = JSON.parse(json) as { claims: { publishedAt: unknown } };

        expect(parsed.claims.publishedAt).toBeTypeOf('string');
    });
});
