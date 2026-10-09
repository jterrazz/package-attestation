// invariant: the v1 rules are frozen — every published attestation was signed over the bytes they produce; a change ships as CANONICAL_VERSION 2 beside v1, whose verifier stays.
/** Canonicalizes an article body into the bytes an attestation v1 signs: well-formed UTF-16, no leading BOM, NFC, LF line endings, no trailing whitespace but one LF, UTF-8. */
export function canonicalize(input: string): Uint8Array {
    assertWellFormed(input);

    const normalized = input.replace(/^﻿/u, '').normalize('NFC').replaceAll(/\r\n?/gu, '\n');

    // hazard: only the end is trimmed — a per-line trim would erase a markdown soft break, a tab substitution a code block, and so the meaning of a published article.
    return new TextEncoder().encode(`${normalized.replace(/\s+$/u, '')}\n`);
}

export class InvalidContentError extends Error {
    override name = 'InvalidContentError';
}

function assertWellFormed(input: string): void {
    let index = 0;
    for (const character of input) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint >= 0xd8_00 && codePoint <= 0xdb_ff) {
            throw new InvalidContentError(`Unpaired high surrogate at index ${index}`);
        }
        if (codePoint >= 0xdc_00 && codePoint <= 0xdf_ff) {
            throw new InvalidContentError(`Unpaired low surrogate at index ${index}`);
        }
        index += character.length;
    }
}
