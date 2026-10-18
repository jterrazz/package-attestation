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

const READ = 'https://github.com/jterrazz/package-attestation/blob/main/docs/reference/cli.md#';

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
            · Content digest: 0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe
            · Opening the browser to sign with your wallet
            ✓ Signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            ✓ Wrote en.attestation.json
            · Attestation digest (a next revision's --prior-attestation): 0x129fbbdceeaf6ee2b4f00d741c2ebd3ae059ce79ecf85e8689ab425111c37937
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
        // Given - the same article signed as the last revision a uint16 holds, after an earlier attestation, its title and locale given inline
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/wallet/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('./__fixtures__/article/'))
            .env(HEADLESS)
            .exec(
                `node_modules/.bin/attestation sign en.md --title=T --slug s --locale=fr --revision 65535 --prior-attestation ${PRIOR} --published-at 2024-05-09T00:00:00Z --skip-stamp`,
            );

        // Then - the claims carry the revision chain and the locale
        expect(result.exitCode).toBe(0);
        expect(text(result.file('en.attestation.json').content)).toMatch(`
            {
              "claims": {
                "priorAttestation": "0x12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab12ab",
                "publishedAt": "1715212800",
                "revision": 65535,
                "slug": "s"
              },
              "schemaVersion": 1,
              "signature": "0x23a8a4ebc0195a5d930e28ce1fc33a09b9b66cd14303fcda207d469d3c9d7c0d720d91bb5bc703afbe3b459afdef2ba1253874576eb6baa685538cd89f927b291b",
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
                `node_modules/.bin/attestation sign en.md --title 'Cost \${1+1} and \${globalThis.pwned=7}' --slug s --published-at 2024-05-09T00:00:00Z --skip-stamp`,
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
            found: the wallet's signature does not verify (signer-mismatch) · why: an attestation that fails verification proves nothing, so none was written · fix: sign again with the account the wallet shows; if it fails again, the wallet signed other data than the page served · read: ${READ}sign
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
            · Content digest: 0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe
            · Opening the browser to sign with your wallet
            ✓ Signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            ✓ Wrote en.attestation.json
            · Attestation digest (a next revision's --prior-attestation): 0x{{sha}}
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
            · Content digest: 0x0c756fb254e676df5d0c429a6d7120a86ab9dfff689c6ad913fd53811b9dd1fe
            · Opening the browser to sign with your wallet
            ✓ Signed by 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            ✓ Wrote en.attestation.json
            · Attestation digest (a next revision's --prior-attestation): 0xd00daef9022552a175f58f59e74d443b03475b7c93989cda264870191ade093c
            · Submitting to the OpenTimestamps calendars
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

    test('signs an article holding invisible characters when the audit is skipped', async () => {
        // Given - the article with a zero-width space and a right-to-left override, signed with --skip-audit
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/wallet/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('./__fixtures__/suspicious/'))
            .env(HEADLESS)
            .exec(
                'node_modules/.bin/attestation sign en.md --title T --slug s --published-at 2024-05-09T00:00:00Z --skip-audit --skip-stamp',
            );

        // Then - no audit, and the attestation written
        expect(result.exitCode).toBe(0);
        expect(result.file('en.attestation.json').exists).toBe(true);
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
        `);
        expect(result.stderr).toMatch(`
            found: 2 invisible or directional character(s) in en.md, listed above · why: they hide or reorder text, so a reader would not see what is signed · fix: remove them from the article, or pass --skip-audit to sign it as it is · read: ${READ}sign
        `);
        expect(result.file('en.attestation.json').exists).toBe(false);
    });

    test.each([
        {
            argv: ``,
            label: 'no file',
            refusal: `found: \`attestation sign\` names no article · why: the file, its title and its slug are what is signed · fix: name the markdown file of the article: attestation sign en.md --title <t> --slug <s> · read: ${READ}sign`,
        },
        {
            argv: `en.md --slug s`,
            label: 'no title',
            refusal: `found: --title is missing or empty · why: the file, its title and its slug are what is signed · fix: give the article's title: --title <t> · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T`,
            label: 'no slug',
            refusal: `found: --slug is missing or empty · why: the file, its title and its slug are what is signed · fix: give the article's slug: --slug <s> · read: ${READ}sign`,
        },
        {
            argv: `en.md --title "" --slug s`,
            label: 'an empty title',
            refusal: `found: --title is missing or empty · why: the file, its title and its slug are what is signed · fix: give the article's title: --title <t> · read: ${READ}sign`,
        },
        {
            argv: `en.md --title --slug s`,
            label: 'a title flag with no value',
            refusal: `found: --title has no value · why: a flag read without its value would run the command on another value than the one meant · fix: write it --title <value>, or --title=<value> for a value that starts with -- · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug`,
            label: 'a slug flag at the end, with no value',
            refusal: `found: --slug has no value · why: a flag read without its value would run the command on another value than the one meant · fix: write it --slug <value>, or --slug=<value> for a value that starts with -- · read: ${READ}sign`,
        },
        {
            argv: `en.md --title a --title b --slug s`,
            label: 'a title given twice',
            refusal: `found: --title is given more than once · why: the command reads it once, and a second value would silently replace the first · fix: give --title once · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --skip-stamp --skip-stamp`,
            label: 'a switch given twice',
            refusal: `found: --skip-stamp is given more than once · why: the command reads it once, and a second value would silently replace the first · fix: give --skip-stamp once · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --skip-stamp=yes`,
            label: 'a switch given a value',
            refusal: `found: --skip-stamp takes no value · why: a value the command does not read would be ignored, and the run would not be the one asked for · fix: write it --skip-stamp, alone · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --explorer x`,
            label: 'a flag of another command',
            refusal: `found: \`attestation sign\` has no flag --explorer · why: a flag the command does not have is a typo or meant for another command, and the run would not be the one asked for · fix: drop it; the usage is attestation sign <file> --title <t> --slug <s> [--locale <l>] [--published-at <iso>] [--revision <n>] [--prior-attestation <0x...>] [--skip-audit] [--skip-stamp] · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s -t`,
            label: 'a short flag it does not have',
            refusal: `found: \`attestation sign\` has no flag -t · why: a flag the command does not have is a typo or meant for another command, and the run would not be the one asked for · fix: drop it; the usage is attestation sign <file> --title <t> --slug <s> [--locale <l>] [--published-at <iso>] [--revision <n>] [--prior-attestation <0x...>] [--skip-audit] [--skip-stamp] · read: ${READ}sign`,
        },
        {
            argv: `en.md fr.md --title T --slug s`,
            label: 'a second file',
            refusal: `found: \`attestation sign\` was given fr.md, a second <file> · why: the command reads one, and the others would be silently ignored · fix: name one <file> per run · read: ${READ}sign`,
        },
        {
            argv: `article.md --title T --slug s`,
            label: 'a file name that names no locale',
            refusal: `found: the file name article.md names no locale · why: the locale is signed, and without --locale it is read from a two-letter file name · fix: pass the locale (--locale en), or name the file by it (en.md) · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --revision 0`,
            label: 'a revision of 0',
            refusal: `found: --revision 0 is no revision · why: revisions are counted from 1, and signed as a uint16 · fix: give a whole number from 1 to 65535: --revision 2 · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --revision 2.5`,
            label: 'a fractional revision',
            refusal: `found: --revision 2.5 is no revision · why: revisions are counted from 1, and signed as a uint16 · fix: give a whole number from 1 to 65535: --revision 2 · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --revision 1a`,
            label: 'a revision with a letter',
            refusal: `found: --revision 1a is no revision · why: revisions are counted from 1, and signed as a uint16 · fix: give a whole number from 1 to 65535: --revision 2 · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --revision 65536`,
            label: 'a revision past a uint16',
            refusal: `found: --revision 65536 is no revision · why: revisions are counted from 1, and signed as a uint16 · fix: give a whole number from 1 to 65535: --revision 2 · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --prior-attestation 0x12`,
            label: 'a prior attestation that is no digest',
            refusal: `found: --prior-attestation 0x12 is no 32-byte digest · why: the prior attestation is signed as a bytes32 · fix: give the attestation digest \`sign\` printed for the revision this one follows: 0x and 64 hex digits · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --prior-attestation x${PRIOR}`,
            label: 'a prior attestation behind a prefix',
            refusal: `found: --prior-attestation x${PRIOR} is no 32-byte digest · why: the prior attestation is signed as a bytes32 · fix: give the attestation digest \`sign\` printed for the revision this one follows: 0x and 64 hex digits · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --prior-attestation ${PRIOR}ff`,
            label: 'a prior attestation one byte too long',
            refusal: `found: --prior-attestation ${PRIOR}ff is no 32-byte digest · why: the prior attestation is signed as a bytes32 · fix: give the attestation digest \`sign\` printed for the revision this one follows: 0x and 64 hex digits · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --published-at yesterday`,
            label: 'a date that is none',
            refusal: `found: --published-at yesterday is no date · why: the publication date is signed, in unix seconds · fix: give an ISO 8601 date: --published-at 2024-05-09T00:00:00Z · read: ${READ}sign`,
        },
        {
            argv: `de.md --title T --slug s`,
            label: 'a file that does not exist',
            refusal: `found: no file de.md · why: the signature is over the content of that file · fix: name the markdown file of the article, from the directory you run in · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T --slug s --revision=0`,
            label: 'a revision given inline that is none',
            refusal: `found: --revision 0 is no revision · why: revisions are counted from 1, and signed as a uint16 · fix: give a whole number from 1 to 65535: --revision 2 · read: ${READ}sign`,
        },
        {
            argv: `en.md --title T -Xskip-stamp --slug s`,
            label: 'a flag behind one dash',
            refusal: `found: \`attestation sign\` has no flag -Xskip-stamp · why: a flag the command does not have is a typo or meant for another command, and the run would not be the one asked for · fix: drop it; the usage is attestation sign <file> --title <t> --slug <s> [--locale <l>] [--published-at <iso>] [--revision <n>] [--prior-attestation <0x...>] [--skip-audit] [--skip-stamp] · read: ${READ}sign`,
        },
    ])(
        // Given - the binary asked to sign with $label
        // Then - the refusal in four parts on stderr, and nothing written
        'refuses $label',
        async ({ argv, refusal }) => {
            const result = await cli
                .link('@jterrazz/attestation', packed())
                .fixture(directory('./__fixtures__/article/'))
                .exec(`node_modules/.bin/attestation sign ${argv}`);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toMatch(`${refusal}\n`);
            expect(result.file('en.attestation.json').exists).toBe(false);
        },
    );
});
