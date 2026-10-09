import { parseArgs } from 'node:util';

import { messageOf } from '../primitives/error-message.js';
import { fmt } from './io.js';
import { runSign } from './sign.js';
import { runUpgrade } from './upgrade.js';
import { runVerify } from './verify.js';

const HELP = `${fmt.bold('attestation')} — sign articles with EIP-712 + Bitcoin (OpenTimestamps).

Usage:
  attestation sign <file> --title <t> --slug <s> [--locale <l>] [--published-at <iso>] [--revision <n>] [--prior-attestation <0x…>] [--skip-audit] [--skip-stamp]
  attestation verify <url|file> [--skip-ots] [--explorer <esplora-url>]
  attestation upgrade <ots-file> [<ots-file> …]
`;

/** Runs one command line of the `attestation` binary and answers its exit code: 0 done, 1 refused or failed, 2 no such command. */
export async function runCli(argv: string[]): Promise<number> {
    const [command, ...rest] = argv;

    if (command === undefined || command === '-h' || command === '--help' || command === 'help') {
        process.stdout.write(HELP);
        return 0;
    }

    try {
        if (command === 'sign') {
            return await dispatchSign(rest);
        }
        if (command === 'verify') {
            return await dispatchVerify(rest);
        }
        if (command === 'upgrade') {
            return await dispatchUpgrade(rest);
        }
        process.stderr.write(`Unknown command: ${command}\n${HELP}`);
        return 2;
    } catch (error) {
        process.stderr.write(`${fmt.fail('Error:')} ${messageOf(error)}\n`);
        return 1;
    }
}

async function dispatchSign(argv: string[]): Promise<number> {
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        args: argv,
        options: {
            locale: { type: 'string' },
            'prior-attestation': { type: 'string' },
            'published-at': { type: 'string' },
            revision: { type: 'string' },
            'skip-audit': { type: 'boolean' },
            'skip-stamp': { type: 'boolean' },
            slug: { type: 'string' },
            title: { type: 'string' },
        },
    });

    await runSign({
        file: required(positionals[0], '<file> argument'),
        locale: values.locale,
        priorAttestation: hexOf(values['prior-attestation']),
        publishedAt: values['published-at'],
        revision: revisionOf(values.revision),
        skipAudit: values['skip-audit'],
        skipStamp: values['skip-stamp'],
        slug: required(values.slug, '--slug'),
        title: required(values.title, '--title'),
    });
    return 0;
}

async function dispatchVerify(argv: string[]): Promise<number> {
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        args: argv,
        options: {
            explorer: { type: 'string' },
            'skip-ots': { type: 'boolean' },
        },
    });

    const verified = await runVerify({
        explorerUrl: values.explorer,
        skipOts: values['skip-ots'],
        target: required(positionals[0], '<url|file> argument'),
    });
    return verified ? 0 : 1;
}

async function dispatchUpgrade(argv: string[]): Promise<number> {
    const { positionals } = parseArgs({ allowPositionals: true, args: argv, options: {} });
    await runUpgrade({ files: positionals });
    return 0;
}

function required(value: string | undefined, name: string): string {
    if (value === undefined || value === '') {
        throw new Error(`Missing required ${name}.`);
    }
    return value;
}

function hexOf(value: string | undefined): `0x${string}` | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!/^0x[\dA-Fa-f]{64}$/u.test(value)) {
        throw new Error(
            `--prior-attestation must be a 32-byte hex digest (0x + 64 hex), got ${value}.`,
        );
    }
    return `0x${value.slice(2)}`;
}

function revisionOf(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!/^[1-9]\d*$/u.test(value)) {
        throw new Error(`--revision must be a positive integer, got ${value}.`);
    }
    return Number(value);
}
