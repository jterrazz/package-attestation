/**
 * Canonicalize an article body for attestation v1.
 *
 * FROZEN CONTRACT — v1 rules below must NEVER change. Any modification requires
 * publishing a v2 alongside (and v1 verifiers stay alive forever).
 *
 * Rules applied in order:
 *  1. Reject unpaired UTF-16 surrogates (corrupt input).
 *  2. Strip a leading BOM (U+FEFF) if present.
 *  3. Apply Unicode NFC normalization.
 *  4. Convert CRLF and stray CR to LF.
 *  5. Trim trailing whitespace and append exactly one LF.
 *  6. Encode as UTF-8 bytes.
 *
 * No markdown parsing. No per-line whitespace trim (would break "  \n" soft breaks).
 * No tab → space substitution (would break code blocks).
 * No interior whitespace collapsing.
 */
export function canonicalize(input: string): Uint8Array {
    assertValidUtf16(input);

    let s = input;
    if (s.charCodeAt(0) === 0xfe_ff) {
        s = s.slice(1);
    }
    s = s.normalize('NFC');
    s = s.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    // \s with /u flag covers all ECMAScript whitespace, including U+00A0 and U+FEFF.
    s = `${s.replace(/\s+$/u, '')}\n`;

    return new TextEncoder().encode(s);
}

/**
 * Version of the canonicalization algorithm that produced bytes.
 * Embedded into every attestation so future verifiers can dispatch correctly.
 */
export { CANONICAL_VERSION as canonicalVersion } from '../version.js';

export class InvalidContentError extends Error {
    override name = 'InvalidContentError';
}

function assertValidUtf16(s: string): void {
    for (let i = 0; i < s.length; i += 1) {
        const code = s.charCodeAt(i);
        if (code >= 0xd8_00 && code <= 0xdb_ff) {
            const next = s.charCodeAt(i + 1);
            if (!(next >= 0xdc_00 && next <= 0xdf_ff)) {
                throw new InvalidContentError(`Unpaired high surrogate at index ${i}`);
            }
            i += 1;
        } else if (code >= 0xdc_00 && code <= 0xdf_ff) {
            throw new InvalidContentError(`Unpaired low surrogate at index ${i}`);
        }
    }
}
