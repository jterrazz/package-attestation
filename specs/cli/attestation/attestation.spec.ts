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

    test.each([
        {
            argv: 'sign --help',
            usage: 'attestation sign <file> --title <t> --slug <s> [--locale <l>] [--published-at <iso>] [--revision <n>] [--prior-attestation <0x…>] [--skip-audit] [--skip-stamp]',
        },
        {
            argv: 'verify en.md -h',
            usage: 'attestation verify <url|file> [--skip-ots] [--explorer <esplora-url>]',
        },
        {
            argv: 'upgrade --nope --help',
            usage: 'attestation upgrade <ots-file> [<ots-file> …]',
        },
    ])(
        // Given - one command asked for its usage as "$argv", whatever else the line holds
        // Then - that command's usage, and success
        'prints the usage of one command for "$argv"',
        async ({ argv, usage }) => {
            const result = await cli
                .link('@jterrazz/attestation', packed())
                .exec(`node_modules/.bin/attestation ${argv}`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout.text).toBe(
                `attestation — sign articles with EIP-712 + Bitcoin (OpenTimestamps).\n\nUsage:\n  ${usage}\n`,
            );
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
