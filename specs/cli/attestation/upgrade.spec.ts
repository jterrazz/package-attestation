import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

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

    test('refuses a call that names no proof', async () => {
        // Given - the binary asked to upgrade nothing
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .exec('node_modules/.bin/attestation upgrade');

        // Then - the refusal on stderr
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(`
            Error: No .ots files provided.
        `);
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
