import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';

import { canonicalize } from '../../../src/primitives/canonicalize.js';
import { integration } from '../integration.specification.js';

/**
 * The frozen byte-and-digest goldens for canonicalize() v1.
 *
 * Every golden here carries `{ frozen: true }`: TEST_UPDATE must never
 * rewrite one, because a rewrite is exactly the event that makes every
 * attestation ever signed against v1 unverifiable. A case is retired by
 * introducing CANONICAL_VERSION=2 alongside v1, never by regenerating.
 */

type Case = { name: string; input: string };

const CASES: Case[] = [
    { input: '', name: '01-empty' },
    { input: '# Hello\n\nWorld.', name: '02-plain-ascii' },
    { input: 'Hello 🦊 fox', name: '03-emoji-4byte-utf8' },
    { input: 'café', name: '04-combining-diacritics-decomposed' },
    { input: 'café', name: '05-combining-diacritics-precomposed' },
    { input: 'a\r\nb\r\nc', name: '06-crlf-line-endings' },
    { input: 'a\rb\rc', name: '07-cr-only-line-endings' },
    { input: '﻿hello', name: '08-bom-prefix' },
    { input: '```\n    indented\n\tcode\n```', name: '09-code-block-indentation' },
    { input: 'line1  \nline2', name: '10-soft-line-break-preserved' },
    { input: 'abc   \t  ', name: '11-trailing-whitespace-no-newline' },
    { input: 'abc\n\n\n\n', name: '12-multiple-trailing-newlines' },
    { input: '日本語\n中文\n한국어', name: '13-cjk-text' },
    { input: 'מימין לשמאל', name: '14-rtl-hebrew' },
];

const sha256Hex = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test.each(CASES)('$name canonicalizes to the bytes v1 froze', async ({ input, name }) => {
    // Given - one input of the frozen v1 table, canonicalized
    const result = await integration.call(() => {
        const bytes = canonicalize(input);
        return {
            byteLength: bytes.length,
            digest: sha256Hex(bytes),
            utf8: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
        };
    });

    // Then - the length, the digest and the decoded text the contract pins
    expect(result.value).toMatch(`${name}.json`, { frozen: true });
    await expect(result.error).toBeEmpty();
});

test('the two Unicode forms of the same glyph canonicalize to one digest', async () => {
    // Given - the decomposed and the precomposed spelling of the same word
    const result = await integration.call(() => {
        const decomposed = canonicalize('café');
        const precomposed = canonicalize('café');
        return { decomposed: sha256Hex(decomposed), precomposed: sha256Hex(precomposed) };
    });

    // Then - NFC collapsed them before a single byte was hashed
    expect(result.value.value.decomposed).toBe(result.value.value.precomposed);
    await expect(result.error).toBeEmpty();
});
