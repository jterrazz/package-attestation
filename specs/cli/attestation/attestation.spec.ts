import { packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('attestation', () => {
    test.each([{ argv: '' }, { argv: '--help' }, { argv: '-h' }, { argv: 'help' }])(
        // Given - the installed binary asked for its usage as "$argv"
        // Then - the usage, and success
        'prints its usage for "$argv"',
        async ({ argv }) => {
            const result = await cli
                .link('@jterrazz/attestation', packed())
                .exec(`node_modules/.bin/attestation ${argv}`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toMatch(`
                attestation — sign articles with EIP-712 + Bitcoin (OpenTimestamps).

                Usage:
                  attestation sign <file> --title <t> --slug <s> [--locale <l>] [--published-at <iso>] [--revision <n>] [--prior-attestation <0x…>] [--skip-audit] [--skip-stamp]
                  attestation verify <url|file> [--skip-ots] [--explorer <esplora-url>]
                  attestation upgrade <ots-file> [<ots-file> …]
            `);
        },
    );

    test('refuses a command it does not know, with its usage', async () => {
        // Given - the installed binary asked for a command it does not have
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .exec('node_modules/.bin/attestation stamp en.md');

        // Then - the command named on stderr, and the usage exit code
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toMatch(`
            Unknown command: stamp
            attestation — sign articles with EIP-712 + Bitcoin (OpenTimestamps).

            Usage:
              attestation sign <file> --title <t> --slug <s> [--locale <l>] [--published-at <iso>] [--revision <n>] [--prior-attestation <0x…>] [--skip-audit] [--skip-stamp]
              attestation verify <url|file> [--skip-ots] [--explorer <esplora-url>]
              attestation upgrade <ots-file> [<ots-file> …]
        `);
        expect(result.stdout.text).toBe('');
    });
});
