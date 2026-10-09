import { describe, expect, test } from 'vitest';

import { audit } from '../audit.js';
import { canonicalize } from '../canonicalize.js';

describe('audit', () => {
    test.each([
        { label: 'clean ASCII', text: '# Article\n\nNormal content.' },
        { label: 'clean Unicode', text: 'Café 日本語 🦊 שלום' },
    ])(
        // Given - $label
        // Then - nothing is flagged
        'flags nothing in $label',
        ({ text }) => {
            expect(audit(canonicalize(text))).toStrictEqual([]);
        },
    );

    test('flags every invisible and directional character it knows, with its place', () => {
        // Given - one of each, on lines and columns of their own
        const suspicious = [
            0x20_0b, 0x20_0c, 0x20_0d, 0x20_60, 0xfe_ff, 0x20_2a, 0x20_2b, 0x20_2c, 0x20_2d,
            0x20_2e, 0x20_66, 0x20_67, 0x20_68, 0x20_69,
        ];
        const text = suspicious
            .map((codepoint, index) => `${'x'.repeat(index)}${String.fromCodePoint(codepoint)}`)
            .join('\n');

        // Then - each is named where it stands
        expect(audit(canonicalize(text))).toStrictEqual([
            { codepoint: 0x20_0b, column: 1, line: 1, name: 'zero-width space' },
            { codepoint: 0x20_0c, column: 2, line: 2, name: 'zero-width non-joiner' },
            { codepoint: 0x20_0d, column: 3, line: 3, name: 'zero-width joiner' },
            { codepoint: 0x20_60, column: 4, line: 4, name: 'word joiner' },
            {
                codepoint: 0xfe_ff,
                column: 5,
                line: 5,
                name: 'zero-width no-break space (interior BOM)',
            },
            { codepoint: 0x20_2a, column: 6, line: 6, name: 'left-to-right embedding' },
            { codepoint: 0x20_2b, column: 7, line: 7, name: 'right-to-left embedding' },
            { codepoint: 0x20_2c, column: 8, line: 8, name: 'pop directional formatting' },
            { codepoint: 0x20_2d, column: 9, line: 9, name: 'left-to-right override' },
            { codepoint: 0x20_2e, column: 10, line: 10, name: 'right-to-left override' },
            { codepoint: 0x20_66, column: 11, line: 11, name: 'left-to-right isolate' },
            { codepoint: 0x20_67, column: 12, line: 12, name: 'right-to-left isolate' },
            { codepoint: 0x20_68, column: 13, line: 13, name: 'first strong isolate' },
            { codepoint: 0x20_69, column: 14, line: 14, name: 'pop directional isolate' },
        ]);
    });

    test('refuses bytes that are no UTF-8', () => {
        // Given - a lone continuation byte, which no canonicalization writes
        const bytes = new Uint8Array([0x61, 0xff]);

        // Then - the decoder's refusal, never a replacement character read as text
        expect(() => audit(bytes)).toThrow(TypeError);
    });

    test('counts a column per code point, an astral one included', () => {
        // Given - a fox emoji, then a zero-width space, after a line break
        const text = 'first\n🦊a​b‮';

        // Then - two findings on line 2, the emoji one column wide
        expect(audit(canonicalize(text))).toStrictEqual([
            { codepoint: 0x20_0b, column: 3, line: 2, name: 'zero-width space' },
            { codepoint: 0x20_2e, column: 5, line: 2, name: 'right-to-left override' },
        ]);
    });
});
