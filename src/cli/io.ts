/* ANSI helpers — kept tiny so we don't pull in chalk. */

const supportsColor = process.stdout.isTTY && (process.env.NO_COLOR ?? '') === '';

export const fmt = {
    bold: (s: string): string => (supportsColor ? `\u001B[1m${s}\u001B[0m` : s),
    dim: (s: string): string => (supportsColor ? `\u001B[2m${s}\u001B[0m` : s),
    fail: (s: string): string => (supportsColor ? `\u001B[31m${s}\u001B[0m` : s),
    info: (s: string): string => (supportsColor ? `\u001B[36m${s}\u001B[0m` : s),
    ok: (s: string): string => (supportsColor ? `\u001B[32m${s}\u001B[0m` : s),
    warn: (s: string): string => (supportsColor ? `\u001B[33m${s}\u001B[0m` : s),
};

export function checkmark(): string {
    return fmt.ok('✓');
}

export function crossmark(): string {
    return fmt.fail('✗');
}
