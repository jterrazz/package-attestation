import { messageOf } from '../primitives/error-message.js';
import { readLine } from './arguments.js';
import type { CommandName, Line, Surface } from './arguments.js';
import { fmt } from './io.js';
import { RefusalError } from './refusal.js';
import { runSign } from './sign.js';
import { runUpgrade } from './upgrade.js';
import { runVerify } from './verify.js';

const SURFACES: Readonly<Record<CommandName, Surface>> = {
    sign: {
        flags: {
            locale: true,
            'prior-attestation': true,
            'published-at': true,
            revision: true,
            'skip-audit': false,
            'skip-stamp': false,
            slug: true,
            title: true,
        },
        operand: '<file>',
        usage: 'attestation sign <file> --title <t> --slug <s> [--locale <l>] [--published-at <iso>] [--revision <n>] [--prior-attestation <0x…>] [--skip-audit] [--skip-stamp]',
    },
    upgrade: {
        flags: {},
        usage: 'attestation upgrade <ots-file> [<ots-file> …]',
    },
    verify: {
        flags: { explorer: true, 'skip-ots': false },
        operand: '<url|file>',
        usage: 'attestation verify <url|file> [--skip-ots] [--explorer <esplora-url>]',
    },
};

const MAX_REVISION = 65_535;

const TITLE = `${fmt.bold('attestation')} — sign articles with EIP-712 + Bitcoin (OpenTimestamps).`;

const HELP = `${TITLE}

Usage:
${(['sign', 'verify', 'upgrade'] as const).map((name) => `  ${SURFACES[name].usage}\n`).join('')}`;

const isCommand = (name: string): name is CommandName => Object.hasOwn(SURFACES, name);

/** Runs one command line of the `attestation` binary and answers its exit code: 0 done, 1 refused or failed, 2 no such command. */
export async function runCli(argv: string[]): Promise<number> {
    const [command, ...rest] = argv;

    if (command === undefined || command === '-h' || command === '--help' || command === 'help') {
        process.stdout.write(HELP);
        return 0;
    }
    if (!isCommand(command)) {
        process.stderr.write(`Unknown command: ${command}\n${HELP}`);
        return 2;
    }

    try {
        const line = readLine(command, SURFACES[command], rest);
        if (line === null) {
            process.stdout.write(`${TITLE}\n\nUsage:\n  ${SURFACES[command].usage}\n`);
            return 0;
        }
        return await DISPATCH[command](line);
    } catch (error) {
        process.stderr.write(
            error instanceof RefusalError
                ? `${error.message}\n`
                : `${fmt.fail('Error:')} ${messageOf(error)}\n`,
        );
        return 1;
    }
}

const DISPATCH: Readonly<Record<CommandName, (line: Line) => Promise<number>>> = {
    sign: async ({ operands, switches, values }) => {
        await runSign({
            file: required(operands[0], 'sign', {
                fix: 'name the markdown file of the article: attestation sign en.md --title <t> --slug <s>',
                found: '`attestation sign` names no article',
            }),
            locale: values.get('locale'),
            priorAttestation: hexOf(values.get('prior-attestation')),
            publishedAt: values.get('published-at'),
            revision: revisionOf(values.get('revision')),
            skipAudit: switches.has('skip-audit'),
            skipStamp: switches.has('skip-stamp'),
            slug: required(values.get('slug'), 'sign', {
                fix: "give the article's slug: --slug <s>",
                found: '--slug is missing or empty',
            }),
            title: required(values.get('title'), 'sign', {
                fix: "give the article's title: --title <t>",
                found: '--title is missing or empty',
            }),
        });
        return 0;
    },
    upgrade: async ({ operands }) => {
        await runUpgrade({ files: operands });
        return 0;
    },
    verify: async ({ operands, switches, values }) => {
        const verified = await runVerify({
            explorerUrl: values.get('explorer'),
            skipOts: switches.has('skip-ots'),
            target: required(operands[0], 'verify', {
                fix: "name the article's markdown file or its URL: attestation verify en.md",
                found: '`attestation verify` names no article',
            }),
        });
        return verified ? 0 : 1;
    },
};

function required(
    value: string | undefined,
    read: 'sign' | 'verify',
    lesson: { found: string; fix: string },
): string {
    if (value === undefined || value === '') {
        throw new RefusalError({
            ...lesson,
            read,
            why:
                read === 'sign'
                    ? 'the file, its title and its slug are what is signed'
                    : 'there is nothing to verify without it',
        });
    }
    return value;
}

function hexOf(value: string | undefined): `0x${string}` | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!/^0x[\dA-Fa-f]{64}$/u.test(value)) {
        throw new RefusalError({
            fix: 'give the attestation digest `sign` printed for the revision this one follows: 0x and 64 hex digits',
            found: `--prior-attestation ${value} is no 32-byte digest`,
            read: 'sign',
            why: 'the prior attestation is signed as a bytes32',
        });
    }
    return `0x${value.slice(2)}`;
}

function revisionOf(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!/^[1-9]\d*$/u.test(value) || Number(value) > MAX_REVISION) {
        throw new RefusalError({
            fix: `give a whole number from 1 to ${MAX_REVISION}: --revision 2`,
            found: `--revision ${value} is no revision`,
            read: 'sign',
            why: 'revisions are counted from 1, and signed as a uint16',
        });
    }
    return Number(value);
}
