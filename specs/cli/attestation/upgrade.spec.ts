import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

const READ = 'https://github.com/jterrazz/package-attestation/blob/main/docs/reference/cli.md#';

describe('upgrade', () => {
    test('leaves a proof already anchored untouched', async () => {
        // Given - the SigNews proof, anchored in its Bitcoin blocks
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('../__fixtures__/signews/'))
            .exec('node_modules/.bin/attestation upgrade en.ots');

        // Then - the file named, and left as it was
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            → en.ots
              · No new attestation available yet, leaving file untouched.
        `);
    });

    test.each([
        {
            argv: ``,
            label: 'no proof',
            refusal: `found: \`attestation upgrade\` names no .ots file · why: it upgrades the proofs it is given, and no other · fix: name the proofs \`sign\` wrote: attestation upgrade en.ots · read: ${READ}upgrade`,
        },
        {
            argv: `en.ots --skip-ots`,
            label: 'a flag it does not have',
            refusal: `found: \`attestation upgrade\` has no flag --skip-ots · why: a flag the command does not have is a typo or meant for another command, and the run would not be the one asked for · fix: drop it — attestation upgrade <ots-file> [<ots-file> …] · read: ${READ}upgrade`,
        },
        {
            argv: `gone.ots`,
            label: 'a proof that does not exist',
            refusal: `found: no file gone.ots · why: only an existing proof can be upgraded · fix: name the .ots file \`sign\` wrote beside the article · read: ${READ}upgrade`,
        },
    ])(
        // Given - the binary asked to upgrade with $label
        // Then - the refusal in four parts on stderr, and nothing on stdout
        'refuses $label',
        async ({ argv, refusal }) => {
            const result = await cli
                .link('@jterrazz/attestation', packed())
                .fixture(directory('./__fixtures__/article/'))
                .exec(`node_modules/.bin/attestation upgrade ${argv}`);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toMatch(`${refusal}\n`);
            expect(result.stdout.text).toBe('');
        },
    );

    test('reads every proof before it rewrites any', async () => {
        // Given - an anchored proof, then a proof that is not there
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('../__fixtures__/signews/'))
            .exec('node_modules/.bin/attestation upgrade en.ots gone.ots');

        // Then - the missing one refused before the first is asked about
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(`
            found: no file gone.ots · why: only an existing proof can be upgraded · fix: name the .ots file \`sign\` wrote beside the article · read: ${READ}upgrade
        `);
        expect(result.stdout.text).toBe('');
    });

    test('refuses bytes that are no proof', async () => {
        // Given - four bytes where a proof should be
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/garbage-proof/'))
            .exec('node_modules/.bin/attestation upgrade en.ots');

        // Then - the refusal on stderr
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(`
            Error: Not an OpenTimestamps proof: the bytes do not read as a detached timestamp file.
        `);
    });
});
