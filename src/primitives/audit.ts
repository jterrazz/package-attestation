const SUSPICIOUS: ReadonlyMap<number, string> = new Map([
    [0x20_0b, 'zero-width space'],
    [0x20_0c, 'zero-width non-joiner'],
    [0x20_0d, 'zero-width joiner'],
    [0x20_60, 'word joiner'],
    [0xfe_ff, 'zero-width no-break space (interior BOM)'],
    [0x20_2a, 'left-to-right embedding'],
    [0x20_2b, 'right-to-left embedding'],
    [0x20_2c, 'pop directional formatting'],
    [0x20_2d, 'left-to-right override'],
    [0x20_2e, 'right-to-left override'],
    [0x20_66, 'left-to-right isolate'],
    [0x20_67, 'right-to-left isolate'],
    [0x20_68, 'first strong isolate'],
    [0x20_69, 'pop directional isolate'],
]);

export type AuditFinding = {
    line: number;
    column: number;
    codepoint: number;
    name: string;
};

// invariant: the audit is the signing author's advice and never a verifier's rule — a verifier stays a function of canonicalize() alone, so an honestly signed attestation never fails a newer verifier.
/** The invisible and directional characters of canonical bytes, each with its line and column. */
export function audit(canonical: Uint8Array): AuditFinding[] {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(canonical);
    const findings: AuditFinding[] = [];
    let line = 1;
    let column = 1;

    for (const character of text) {
        const codepoint = character.codePointAt(0) ?? 0;
        if (codepoint === 0x0a) {
            line += 1;
            column = 1;
            continue;
        }
        const name = SUSPICIOUS.get(codepoint);
        if (name !== undefined) {
            findings.push({ codepoint, column, line, name });
        }
        column += 1;
    }

    return findings;
}
