import { directory, packed } from '@jterrazz/test';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

type Served = AsyncDisposable & { url: string };

// value: the three blocks the SigNews proof is anchored in, each with the merkle root the proof computes for it; 948625, the earliest, was mined at 2026-05-09T14:51:40Z.
const BLOCKS: Record<string, { merkle_root: string; timestamp: number }> = {
    948_625: {
        merkle_root: '8e542cdc20de8e372317dfecb19881385fb2e0ccc1e562ed8794cf7128345f6b',
        timestamp: 1_778_338_300,
    },
    948_647: {
        merkle_root: '4ad55ffb9bb6e9de5d55b207640919035f975da00962235b3a10adc148dd63a3',
        timestamp: 1_778_350_000,
    },
    948_655: {
        merkle_root: '95baa8d64c277bec255273a0fe9ac542e64b61fef1851899386127b1c867cba3',
        timestamp: 1_778_355_000,
    },
};

const READ = 'https://github.com/jterrazz/package-attestation/blob/main/docs/reference/cli.md#';

const SIGNEWS = join(import.meta.dirname, '../__fixtures__/signews');

async function serving(answer: (path: string) => string | Uint8Array | undefined): Promise<Served> {
    const server = createServer((request, response) => {
        const body = answer(request.url ?? '');
        response.statusCode = body === undefined ? 404 : 200;
        response.end(body);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    return {
        [Symbol.asyncDispose]: async () => {
            server.close();
            await once(server, 'close');
        },
        url: `http://127.0.0.1:${port}`,
    };
}

async function explorer(
    merkleOf = (height: string): string | undefined => BLOCKS[height]?.merkle_root,
): Promise<Served> {
    return await serving((path) => {
        const [, kind, key = ''] = path.split('/');
        const height = key.replace('hash-', '');
        if (kind === 'block-height') {
            return BLOCKS[height] === undefined ? undefined : `hash-${height}`;
        }
        const block = BLOCKS[height];
        return block === undefined
            ? undefined
            : JSON.stringify({ ...block, merkle_root: merkleOf(height) });
    });
}

async function site(files: string[]): Promise<Served> {
    const pages = new Map<string, string>([
        ...files.map((name): [string, string] => [
            `/articles/signews/${name}`,
            join(SIGNEWS, name),
        ]),
        [
            '/articles/signews/proof.json',
            join(import.meta.dirname, '__fixtures__/manifest/proof.json'),
        ],
    ]);
    return await serving((path) => {
        const page = pages.get(path);
        return page === undefined ? undefined : new Uint8Array(readFileSync(page));
    });
}

describe('verify', () => {
    test('a signed article verifies, its date skipped when no proof sits beside it', async () => {
        // Given - an article and its attestation
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/article/'))
            .fixture(directory('./__fixtures__/attestation/'))
            .exec('node_modules/.bin/attestation verify en.md');

        // Then - the signature checked, the date skipped
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            ✓ Content digest matches signature
            ✓ Signature valid, signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            · OTS verification skipped
        `);
    });

    test('an anchored article verifies its signature and its Bitcoin date on the explorer it names', async () => {
        // Given - a published article with its anchored proof, and an Esplora double for its blocks
        await using blocks = await explorer();
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('../__fixtures__/signews/'))
            .exec(`node_modules/.bin/attestation verify en.md --explorer ${blocks.url}`);

        // Then - the earliest block's time
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            ✓ Content digest matches signature
            ✓ Signature valid, signed by 0x75117fE22ce373ec31d0Fe07638Afc25a525023b
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948655 is valid
            Lite-client verification, assuming block hash-948647 is valid
            ✓ Bitcoin timestamp confirmed at 2026-05-09T14:51:40.000Z
        `);
    });

    test('a proof whose block disagrees fails the date', async () => {
        // Given - the anchored article, and an explorer whose blocks carry another merkle root
        await using blocks = await explorer(() => '00'.repeat(32));
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('../__fixtures__/signews/'))
            .exec(`node_modules/.bin/attestation verify en.md --explorer ${blocks.url}`);

        // Then - the signature holds and the date is refused
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toMatch(`
            ✓ Content digest matches signature
            ✓ Signature valid, signed by 0x75117fE22ce373ec31d0Fe07638Afc25a525023b
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948655 is valid
            Lite-client verification, assuming block hash-948647 is valid
            ✗ OTS: invalid-proof (bitcoin verification failed: Digest does not match merkleroot)
        `);
    });

    test('an article is verified from its URL, its proof fetched beside it', async () => {
        // Given - the anchored article served with its manifest, and the explorer
        await using blocks = await explorer();
        await using served = await site(['en.md', 'en.attestation.json', 'en.ots']);
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .exec(
                `node_modules/.bin/attestation verify ${served.url}/articles/signews --explorer ${blocks.url}`,
            );

        // Then - both legs pass
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            ✓ Content digest matches signature
            ✓ Signature valid, signed by 0x75117fE22ce373ec31d0Fe07638Afc25a525023b
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948655 is valid
            Lite-client verification, assuming block hash-948647 is valid
            ✓ Bitcoin timestamp confirmed at 2026-05-09T14:51:40.000Z
        `);
    });

    test('an article served with no proof is verified by its signature alone', async () => {
        // Given - the article and its manifest served, its proof missing
        await using served = await site(['en.md', 'en.attestation.json']);
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .exec(`node_modules/.bin/attestation verify ${served.url}/articles/signews/`);

        // Then - the signature passes and the date is skipped
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            ✓ Content digest matches signature
            ✓ Signature valid, signed by 0x75117fE22ce373ec31d0Fe07638Afc25a525023b
            · OTS verification skipped
        `);
    });

    test('an article URL serving no manifest is refused', async () => {
        // Given - a site with nothing at the article
        await using served = await site([]);
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .exec(`node_modules/.bin/attestation verify ${served.url}/articles/gone`);

        // Then - the request that failed, on stderr
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(`
            Error: GET http://127.0.0.1:{{port}}/articles/gone/proof.json: HTTP 404
        `);
    });

    test('refuses content that is not what was signed', async () => {
        // Given - an attestation beside a sentence it was not signed over
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/tampered/'))
            .fixture(directory('./__fixtures__/attestation/'))
            .exec('node_modules/.bin/attestation verify en.md');

        // Then - the failure and both digests
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toMatch(`
            ✗ Verification failed: content-mismatch
              actualDigest: 0xf3fee43567a72a95641034a743871badec26407a450a781b8c7de7c9cfee354c
              expectedDigest: 0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe
        `);
    });

    test('passes an article whose proof is still pending its block', async () => {
        // Given - an article, its attestation, and a calendar-only proof
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/article/'))
            .fixture(directory('./__fixtures__/attestation/'))
            .fixture(directory('./__fixtures__/pending-proof/'))
            .exec('node_modules/.bin/attestation verify en.md');

        // Then - the signature holds, the date is pending, and pending is no failure
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            ✓ Content digest matches signature
            ✓ Signature valid, signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            Ignoring attestation from calendar https://calendar.example.invalid: Calendar not in whitelist
            ✗ OTS: pending-bitcoin
        `);
    });

    test('fails an article whose proof is no proof', async () => {
        // Given - an article, its attestation, and four bytes where its proof should be
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/article/'))
            .fixture(directory('./__fixtures__/attestation/'))
            .fixture(directory('./__fixtures__/garbage-proof/'))
            .exec('node_modules/.bin/attestation verify en.md');

        // Then - the signature holds, and the proof is refused
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toMatch(`
            ✓ Content digest matches signature
            ✓ Signature valid, signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            ✗ OTS: invalid-proof (Not an OpenTimestamps proof: the bytes do not read as a detached timestamp file.)
        `);
    });

    test('checks the signature alone when the date is skipped, whatever proof sits beside it', async () => {
        // Given - the same article and its four bytes of proof, verified with --skip-ots
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/article/'))
            .fixture(directory('./__fixtures__/attestation/'))
            .fixture(directory('./__fixtures__/garbage-proof/'))
            .exec('node_modules/.bin/attestation verify en.md --skip-ots');

        // Then - the signature holds, the date is skipped
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            ✓ Content digest matches signature
            ✓ Signature valid, signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            · OTS verification skipped
        `);
    });

    test('fails a path it cannot read as a file, as a failure rather than a refusal', async () => {
        // Given - the binary asked to verify a directory
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/article/'))
            .exec('node_modules/.bin/attestation verify .');

        // Then - the system's error, named by its code on stderr, since the message after it varies across Node versions
        expect(result.exitCode).toBe(1);
        expect(result.stderr.text).toContain('Error: EISDIR: illegal operation on a directory');
    });

    test.each([
        {
            argv: ``,
            label: 'no article',
            refusal: `found: \`attestation verify\` names no article · why: there is nothing to verify without it · fix: name the article's markdown file or its URL: attestation verify en.md · read: ${READ}verify`,
        },
        {
            argv: `en.md fr.md`,
            label: 'a second article',
            refusal: `found: \`attestation verify\` was given fr.md, a second <url|file> · why: the command reads one, and the others would be silently ignored · fix: name one <url|file> per run · read: ${READ}verify`,
        },
        {
            argv: `en.md --explorer a --explorer b`,
            label: 'an explorer given twice',
            refusal: `found: --explorer is given more than once · why: the command reads it once, and a second value would silently replace the first · fix: give --explorer once · read: ${READ}verify`,
        },
        {
            argv: `en.md --explorer`,
            label: 'an explorer flag with no value',
            refusal: `found: --explorer has no value · why: a flag read without its value would run the command on another value than the one meant · fix: write it --explorer <value>, or --explorer=<value> for a value that starts with -- · read: ${READ}verify`,
        },
        {
            argv: `en.md --skip-ots=no`,
            label: 'a switch given a value',
            refusal: `found: --skip-ots takes no value · why: a value the command does not read would be ignored, and the run would not be the one asked for · fix: write it --skip-ots, alone · read: ${READ}verify`,
        },
        {
            argv: `en.md --title T`,
            label: 'a flag of another command',
            refusal: `found: \`attestation verify\` has no flag --title · why: a flag the command does not have is a typo or meant for another command, and the run would not be the one asked for · fix: drop it; the usage is attestation verify <url|file> [--skip-ots] [--explorer <esplora-url>] · read: ${READ}verify`,
        },
        {
            argv: `./https://example.com/en.md`,
            label: 'a path holding a URL, read as a path',
            refusal: `found: no file ./https://example.com/en.md · why: the signature is checked against the content of that file · fix: name the article's markdown file, or its URL · read: ${READ}verify`,
        },
        {
            argv: `de.md`,
            label: 'an article that does not exist',
            refusal: `found: no file de.md · why: the signature is checked against the content of that file · fix: name the article's markdown file, or its URL · read: ${READ}verify`,
        },
        {
            argv: `en.md`,
            label: 'an article with no attestation beside it',
            refusal: `found: no file en.attestation.json · why: the signature is read from the attestation \`sign\` writes beside the article · fix: sign the article first (attestation sign en.md --title <t> --slug <s>), or verify its URL · read: ${READ}verify`,
        },
        {
            argv: `-`,
            label: 'a lone dash, read as a file',
            refusal: `found: no file - · why: the signature is checked against the content of that file · fix: name the article's markdown file, or its URL · read: ${READ}verify`,
        },
        {
            argv: `--skip-ots -- -h`,
            label: 'an operand after --, read as a file and not a flag',
            refusal: `found: no file -h · why: the signature is checked against the content of that file · fix: name the article's markdown file, or its URL · read: ${READ}verify`,
        },
    ])(
        // Given - the binary asked to verify with $label
        // Then - the refusal in four parts on stderr, and nothing on stdout
        'refuses $label',
        async ({ argv, refusal }) => {
            const result = await cli
                .link('@jterrazz/attestation', packed())
                .fixture(directory('./__fixtures__/article/'))
                .exec(`node_modules/.bin/attestation verify ${argv}`);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toMatch(`${refusal}\n`);
            expect(result.stdout.text).toBe('');
        },
    );
});
