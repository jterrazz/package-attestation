import { file } from '@jterrazz/test';
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';

import { canonicalize } from '../../../src/primitives/canonicalize.js';
import { integration } from '../integration.specification.js';

// invariant: every golden is frozen — TEST_UPDATE rewriting one is the very event that leaves each attestation signed against v1 unverifiable; a case retires only with a CANONICAL_VERSION 2 beside v1.
const CASES = [
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

const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

describe('canonicalize', () => {
    test.each(CASES)(
        // Given - one input of the frozen v1 table, canonicalized
        // Then - the length, the digest and the decoded text the contract pins
        '$name canonicalizes to the bytes v1 froze',
        async ({ input, name }) => {
            const result = await integration.call(() => {
                const bytes = canonicalize(input);
                return {
                    byteLength: bytes.length,
                    digest: sha256Hex(bytes),
                    utf8: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
                };
            });

            expect(result.value).toMatch(file(`./__expected__/${name}.json`), { frozen: true });
            expect(result.error.text).toBe('');
        },
    );
});
