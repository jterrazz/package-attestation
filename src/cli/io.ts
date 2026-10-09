// outside: NO_COLOR (no-color.org) — any non-empty value turns colour off, as does an output that is no terminal.
const supportsColor = process.stdout.isTTY && (process.env.NO_COLOR ?? '') === '';

const paint =
    (code: number) =>
    (text: string): string =>
        // Stryker disable next-line StringLiteral: colour is a terminal's, and the specs read the binary through pipes
        supportsColor ? `\u001B[${code}m${text}\u001B[0m` : text;

export const fmt = {
    bold: paint(1),
    dim: paint(2),
    fail: paint(31),
    info: paint(36),
    ok: paint(32),
    warn: paint(33),
};

export function checkmark(): string {
    return fmt.ok('✓');
}

export function crossmark(): string {
    return fmt.fail('✗');
}
