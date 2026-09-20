import { describe, expect, test } from 'vitest';

import { canonicalize, InvalidContentError } from './canonicalize.js';

const decode = (bytes: Uint8Array): string =>
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);

describe('rule 1 — invalid UTF-16 rejected', () => {
    test('rejects an unpaired high surrogate', () => {
        const bad = `before${String.fromCharCode(0xd8_3d)}after`;
        expect(() => canonicalize(bad)).toThrow(InvalidContentError);
    });

    test('rejects an unpaired low surrogate', () => {
        const bad = `before${String.fromCharCode(0xdc_00)}after`;
        expect(() => canonicalize(bad)).toThrow(InvalidContentError);
    });

    test('accepts valid surrogate pairs (emoji)', () => {
        expect(() => canonicalize('hello 🦊 fox')).not.toThrow();
    });
});

describe('rule 2 — BOM stripping', () => {
    test('strips a leading BOM', () => {
        expect(decode(canonicalize('﻿hello'))).toBe('hello\n');
    });

    test('keeps a BOM in the middle (not at start)', () => {
        expect(decode(canonicalize('a﻿b'))).toBe('a﻿b\n');
    });
});

describe('rule 3 — Unicode NFC', () => {
    test('normalizes "café" with combining acute to NFC', () => {
        const decomposed = 'café';
        const composed = 'café';
        expect(canonicalize(decomposed)).toStrictEqual(canonicalize(composed));
    });

    test('output in NFC round-trips identically', () => {
        const out = canonicalize('café');
        expect(canonicalize(decode(out).slice(0, -1))).toStrictEqual(out);
    });
});

describe('rule 4 — line endings to LF', () => {
    test('converts CRLF to LF', () => {
        expect(decode(canonicalize('a\r\nb\r\nc'))).toBe('a\nb\nc\n');
    });

    test('converts lone CR to LF', () => {
        expect(decode(canonicalize('a\rb\rc'))).toBe('a\nb\nc\n');
    });

    test('handles mixed CRLF / CR / LF in same input', () => {
        expect(decode(canonicalize('a\r\nb\rc\nd'))).toBe('a\nb\nc\nd\n');
    });
});

describe('rule 5 — trailing whitespace and single trailing LF', () => {
    test('appends a trailing LF when missing', () => {
        expect(decode(canonicalize('abc'))).toBe('abc\n');
    });

    test('collapses multiple trailing LFs to one', () => {
        expect(decode(canonicalize('abc\n\n\n'))).toBe('abc\n');
    });

    test('strips trailing spaces and tabs before appending LF', () => {
        expect(decode(canonicalize('abc   \t  '))).toBe('abc\n');
    });

    test(String.raw`preserves "  \n" markdown soft-break in the middle`, () => {
        // Markdown soft break: two trailing spaces before \n.
        // Should NOT be touched mid-document.
        expect(decode(canonicalize('line1  \nline2'))).toBe('line1  \nline2\n');
    });

    test('preserves leading whitespace on indented code blocks', () => {
        const input = '```\n    indented\n\tcode\n```';
        expect(decode(canonicalize(input))).toBe('```\n    indented\n\tcode\n```\n');
    });
});

describe('rule 6 — UTF-8 encoding', () => {
    test('encodes 4-byte emoji correctly', () => {
        const bytes = canonicalize('🦊');
        // Fox emoji U+1F98A is F0 9F A6 8A in UTF-8, plus trailing 0A.
        expect([...bytes]).toStrictEqual([0xf0, 0x9f, 0xa6, 0x8a, 0x0a]);
    });

    test('encodes 3-byte CJK correctly', () => {
        const bytes = canonicalize('日');
        // 日 U+65E5 is E6 97 A5 in UTF-8, plus trailing 0A.
        expect([...bytes]).toStrictEqual([0xe6, 0x97, 0xa5, 0x0a]);
    });
});

describe('determinism', () => {
    test('produces identical bytes across repeated calls', () => {
        const input = '# Hello\n\nWorld 🌍\nLine with **bold**.\n';
        const a = canonicalize(input);
        const b = canonicalize(input);
        expect(a).toStrictEqual(b);
    });

    test('handles the empty string', () => {
        expect(decode(canonicalize(''))).toBe('\n');
    });

    test('handles a string of only whitespace', () => {
        expect(decode(canonicalize('   \n\t\n  '))).toBe('\n');
    });
});
