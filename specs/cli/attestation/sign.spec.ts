import { directory, packed, text } from '@jterrazz/test';
import { dirname } from 'node:path';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

// invariant: the wallet is a stand-in on PATH, first, and nothing else that opens a window is reachable: no /usr/bin, where macOS keeps `open`; on Linux the bundled xdg-open hands the URL to $BROWSER.
const HEADLESS = {
    BROWSER: '$WORKDIR/bin/open',
    DISPLAY: null,
    PATH: [
        '$WORKDIR/bin',
        dirname(process.execPath),
        '/bin',
        ...(process.platform === 'linux' ? ['/usr/bin'] : []),
    ].join(':'),
    XDG_CURRENT_DESKTOP: null,
};

const PRIOR = `0x${'12ab'.repeat(16)}`;

// outside: the OpenTimestamps library's HTTP client honours the proxy variables, so a refusing proxy is every calendar down — nothing leaves the machine.
const NO_CALENDAR = {
    HTTPS_PROXY: 'http://127.0.0.1:9',
    NO_PROXY: null,
    https_proxy: 'http://127.0.0.1:9',
    no_proxy: null,
};

describe('sign', () => {
    test('signs an article with the wallet the page reaches, and writes its attestation beside it', async () => {
        // Given - an article, and a wallet stand-in that signs what the page shows with Hardhat's account 0
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/wallet/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('./__fixtures__/article/'))
            .env(HEADLESS)
            .exec(
                'node_modules/.bin/attestation sign en.md --title "Architects of Inversion" --slug architects-of-inversion --published-at 2024-05-09T00:00:00Z --skip-stamp',
            );

        // Then - each step, and the attestation written is the one v1 froze for this article
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            ✓ Canonicalized 53 bytes (en)
            → Content digest: 0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe
            → Opening browser to sign with your wallet…
            ✓ Signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            ✓ Wrote en.attestation.json
        `);
        expect(text(result.file('en.attestation.json').content)).toMatch(`
            {
              "claims": {
                "priorAttestation": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "publishedAt": "1715212800",
                "revision": 1,
                "slug": "architects-of-inversion"
              },
              "schemaVersion": 1,
              "signature": "0x8af1b32a9152bb527f0ae55f75aca7f84f88dd0fe60309eb669a1bfca9877b8b57fe3b6a04a06d9b94ab79c0dbd5a4d01d3a4680a33509d2d0c32d383e8db7b91b",
              "signerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
              "subject": {
                "contentDigest": "0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe",
                "locale": "en",
                "title": "Architects of Inversion"
              }
            }
        `);
    });

    test('signs a later revision under the locale and the prior attestation it is given', async () => {
        // Given - the same article signed as revision 2 of an earlier attestation, under a file name that names no locale
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/wallet/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('./__fixtures__/article/'))
            .env(HEADLESS)
            .exec(
                `node_modules/.bin/attestation sign en.md --title T --slug s --locale fr --revision 123 --prior-attestation ${PRIOR} --published-at 2024-05-09T00:00:00Z --skip-stamp`,
            );

        // Then - the claims carry the revision chain and the locale
        expect(result.exitCode).toBe(0);
        expect(text(result.file('en.attestation.json').content)).toMatch(`
            {
              "claims": {
                "priorAttestation": "0x12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab",
                "publishedAt": "1715212800",
                "revision": 123,
                "slug": "s"
              },
              "schemaVersion": 1,
              "signature": "0x6b63fd69660a024befc714b6095c55b57579c5666aec329d5a9a4a433afc7f885e70762f6cf791c86b0a38c48363bbc016cc49e039663cb7057f96ac929fc4711c",
              "signerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
              "subject": {
                "contentDigest": "0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe",
                "locale": "fr",
                "title": "T"
              }
            }
        `);
    });

    test('signs a title holding template syntax as written, never as code the page runs', async () => {
        // Given - a title that would interpolate inside a JavaScript template literal
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/wallet/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('./__fixtures__/article/'))
            .env(HEADLESS)
            .exec(
                'node_modules/.bin/attestation sign en.md --title \'Cost ${1+1} and ${globalThis.pwned=7}\' --slug s --published-at 2024-05-09T00:00:00Z --skip-stamp',
            );

        // Then - the title signed and written is the one given, character for character
        expect(result.exitCode).toBe(0);
        expect(text(result.file('en.attestation.json').content)).toMatch(`
            {
              "claims": {
                "priorAttestation": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "publishedAt": "1715212800",
                "revision": 1,
                "slug": "s"
              },
              "schemaVersion": 1,
              "signature": "0xf892c83ab40c348881b557f27f9f15dd7c7873c57248173b3ad0f417e5cf0b9d146135157e2e1b3e2b313cb9ce7e7187429704e618a1651deb43cccf550383d11c",
              "signerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
              "subject": {
                "contentDigest": "0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe",
                "locale": "en",
                "title": "Cost \${1+1} and \${globalThis.pwned=7}"
              }
            }
        `);
    });

    test('refuses a signature that does not recover to the signer the wallet claims, and writes nothing', async () => {
        // Given - a wallet that signs with one account and claims another
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/wallet/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('./__fixtures__/article/'))
            .env({ ...HEADLESS, CLAIMED_SIGNER: `0x${'cd'.repeat(20)}` })
            .exec(
                'node_modules/.bin/attestation sign en.md --title T --slug s --published-at 2024-05-09T00:00:00Z --skip-stamp',
            );

        // Then - the refusal, and no attestation
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(`
            Error: The wallet's signature does not verify (signer-mismatch): nothing was written.
        `);
        expect(result.file('en.attestation.json').exists).toBe(false);
    });

    test('dates an article now when no date is given', async () => {
        // Given - an article signed with no --published-at
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/wallet/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('./__fixtures__/article/'))
            .env(HEADLESS)
            .exec('node_modules/.bin/attestation sign en.md --title T --slug s --skip-stamp');

        // Then - it is signed and written, its date the moment of signing
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            ✓ Canonicalized 53 bytes (en)
            → Content digest: 0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe
            → Opening browser to sign with your wallet…
            ✓ Signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            ✓ Wrote en.attestation.json
        `);
    });

    test('refuses to write a proof no calendar answered for', async () => {
        // Given - an article signed, and every OpenTimestamps calendar unreachable behind a proxy that refuses
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/wallet/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('./__fixtures__/article/'))
            .env({ ...HEADLESS, ...NO_CALENDAR })
            .exec(
                'node_modules/.bin/attestation sign en.md --title T --slug s --published-at 2024-05-09T00:00:00Z',
            );

        // Then - the attestation is written, the empty proof is not
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toMatch(`
            ✓ Canonicalized 53 bytes (en)
            → Content digest: 0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe
            → Opening browser to sign with your wallet…
            ✓ Signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            ✓ Wrote en.attestation.json
            → Submitting to OpenTimestamps calendars…
            Submitting to remote calendar https://a.pool.opentimestamps.org
            Submitting to remote calendar https://b.pool.opentimestamps.org
            Submitting to remote calendar https://a.pool.eternitywall.com
            Submitting to remote calendar https://ots.btc.catallaxy.com
        `);
        expect(result.stderr).toMatch(`
            Error: No OpenTimestamps calendar answered: the proof would attest nothing.
        `);
        expect(result.file('en.ots').exists).toBe(false);
    });

    test('refuses an article holding invisible characters before anything is signed', async () => {
        // Given - an article with a zero-width space and a right-to-left override
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/suspicious/'))
            .exec('node_modules/.bin/attestation sign en.md --title T --slug s');

        // Then - each character named where it stands, and the refusal
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toMatch(`
            ✓ Canonicalized 73 bytes (en)
            ! 2 suspicious char(s) found:
              line 1, col 11: U+200B (zero-width space)
              line 1, col 44: U+202E (right-to-left override)
              Pass --skip-audit to sign anyway.
        `);
        expect(result.stderr).toMatch(`
            Error: Audit failed: clean up suspicious characters first.
        `);
    });

    test.each([
        { argv: '', label: 'no file', refusal: 'Error: Missing required <file> argument.' },
        { argv: 'en.md --slug s', label: 'no title', refusal: 'Error: Missing required --title.' },
        { argv: 'en.md --title T', label: 'no slug', refusal: 'Error: Missing required --slug.' },
        {
            argv: 'en.md --title "" --slug s',
            label: 'an empty title',
            refusal: 'Error: Missing required --title.',
        },
        {
            argv: 'article.md --title T --slug s',
            label: 'a file name that names no locale',
            refusal:
                'Error: Cannot derive locale from filename "article.md". Pass --locale explicitly.',
        },
        {
            argv: 'en.md --title T --slug s --revision 0',
            label: 'a revision of 0',
            refusal: 'Error: --revision must be a positive integer, got 0.',
        },
        {
            argv: 'en.md --title T --slug s --revision 2.5',
            label: 'a fractional revision',
            refusal: 'Error: --revision must be a positive integer, got 2.5.',
        },
        {
            argv: 'en.md --title T --slug s --revision 1a',
            label: 'a revision with a letter',
            refusal: 'Error: --revision must be a positive integer, got 1a.',
        },
        {
            argv: 'en.md --title T --slug s --prior-attestation 0x12',
            label: 'a prior attestation that is no digest',
            refusal:
                'Error: --prior-attestation must be a 32-byte hex digest (0x + 64 hex), got 0x12.',
        },
        {
            argv: `en.md --title T --slug s --prior-attestation x${PRIOR}`,
            label: 'a prior attestation behind a prefix',
            refusal: `Error: --prior-attestation must be a 32-byte hex digest (0x + 64 hex), got x${PRIOR}.`,
        },
        {
            argv: `en.md --title T --slug s --prior-attestation ${PRIOR}ff`,
            label: 'a prior attestation one byte too long',
            refusal: `Error: --prior-attestation must be a 32-byte hex digest (0x + 64 hex), got ${PRIOR}ff.`,
        },
        {
            argv: 'en.md --title T --slug s --published-at yesterday',
            label: 'a date that is none',
            refusal: 'Error: --published-at must be a date, got yesterday.',
        },
        {
            argv: 'de.md --title T --slug s',
            label: 'a file that does not exist',
            refusal: "Error: ENOENT: no such file or directory, open 'de.md'",
        },
    ])(
        // Given - the binary asked to sign with $label
        // Then - the refusal on stderr, and nothing on stdout
        'refuses $label',
        async ({ argv, refusal }) => {
            const result = await cli
                .link('@jterrazz/attestation', packed())
                .fixture(directory('./__fixtures__/article/'))
                .exec(`node_modules/.bin/attestation sign ${argv}`);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toMatch(`${refusal}\n`);
        },
    );
});
