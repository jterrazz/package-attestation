import { directory, file, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('sign-batch', () => {
    test('a batch page collects each signature and each refusal by entry, until the author is done', async () => {
        // Given - a consumer standing in for the batch page: it signs one entry, skips the others, then ends
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/consumer/'))
            .exec('sign-batch.mjs');

        // Then - each request's answer, what the flow resolved with, the page, and a flow that never finishes
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(
            file(
                './__expected__/a-batch-page-collects-each-signature-and-each-refusal-by-entry-until-the-author-is-done.txt',
            ),
        );
    });
});
