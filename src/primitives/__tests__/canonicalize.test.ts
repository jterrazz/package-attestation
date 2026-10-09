import { describe, expect, test } from 'vitest';

import { canonicalize, InvalidContentError } from '../canonicalize.js';

const decoded = (bytes: Uint8Array): string =>
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);

describe('canonicalize', () => {
    test.each([
        { input: 'a\r\nb\rc\nd', label: 'mixed CRLF, CR and LF endings', text: 'a\nb\nc\nd\n' },
        { input: '   \n\t\n  ', label: 'whitespace alone', text: '\n' },
        { input: 'a﻿b', label: 'a BOM inside the text', text: 'a﻿b\n' },
        { input: '﻿﻿a', label: 'two leading BOMs', text: '﻿a\n' },
        { input: 'a 　', label: 'a trailing no-break and ideographic space', text: 'a\n' },
        { input: 'ab\r\n\r\n', label: 'trailing CRLF lines', text: 'ab\n' },
        { input: '\r\n  a', label: 'leading blank lines and indentation', text: '\n  a\n' },
    ])(
        // Given - $label
        // Then - the text the canonical bytes decode to
        'canonicalizes $label',
        ({ input, text }) => {
            expect(decoded(canonicalize(input))).toBe(text);
        },
    );

    test.each([
        {
            input: `a${String.fromCodePoint(0xd8_3d)}b`,
            label: 'a high surrogate followed by text',
            message: 'Unpaired high surrogate at index 1',
        },
        {
            input: `ab${String.fromCodePoint(0xdb_ff)}`,
            label: 'a high surrogate ending the text',
            message: 'Unpaired high surrogate at index 2',
        },
        {
            input: `🦊${String.fromCodePoint(0xdc_00)}`,
            label: 'a low surrogate after a pair',
            message: 'Unpaired low surrogate at index 2',
        },
        {
            input: `${String.fromCodePoint(0xdf_ff)}a`,
            label: 'a low surrogate opening the text',
            message: 'Unpaired low surrogate at index 0',
        },
    ])(
        // Given - $label
        // Then - it is refused, the index of the unit named
        'refuses $label',
        ({ input, message }) => {
            expect(() => canonicalize(input)).toThrow(new InvalidContentError(message));
        },
    );

    test('keeps every surrogate pair and the units around the refusal range', () => {
        // Given - a pair, and the code points just outside the surrogate range
        const input = `🦊${String.fromCodePoint(0xd7_ff)}${String.fromCodePoint(0xe0_00)}`;

        // Then - the text survives whole
        expect(decoded(canonicalize(input))).toBe(`${input}\n`);
    });

    test('names its refusal InvalidContentError', () => {
        // Given - a lone surrogate
        const input = String.fromCodePoint(0xd8_00);

        // Then - the error class a caller catches by name
        expect(() => canonicalize(input)).toThrow(
            expect.objectContaining({ name: 'InvalidContentError' }),
        );
    });
});
