import { describe, expect, test } from 'vitest';

import { audit } from './audit.js';
import { canonicalize } from './canonicalize.js';

const auditOf = (s: string) => audit(canonicalize(s));

describe('audit — suspicious character detection', () => {
    test('returns no findings for clean ASCII text', () => {
        expect(auditOf('# Article\n\nNormal content.')).toStrictEqual([]);
    });

    test('returns no findings for clean Unicode text', () => {
        expect(auditOf('Café 日本語 🦊 שלום')).toStrictEqual([]);
    });

    test('flags a zero-width space', () => {
        const findings = auditOf('hello​world');
        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({
            codepoint: 0x20_0b,
            line: 1,
            name: 'zero-width space',
        });
    });

    test('flags an RTL override', () => {
        const findings = auditOf('admin‮exe.');
        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({ codepoint: 0x20_2e, name: 'right-to-left override' });
    });

    test('reports correct line and column', () => {
        const findings = auditOf('line1\nline2 ​ end\nline3');
        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({ codepoint: 0x20_0b, column: 7, line: 2 });
    });

    test('flags multiple suspicious chars in the same input', () => {
        const findings = auditOf('a​b‮c');
        expect(findings).toHaveLength(2);
        expect(findings.map((f) => f.codepoint)).toStrictEqual([0x20_0b, 0x20_2e]);
    });
});
