import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('declarations', () => {
    test('a consumer compiles against the declarations the tarball ships, from an ES module and a CommonJS one', async () => {
        // Given - an .mts and a .cts consumer of the three entries, with the compiler and the Node types beside the packed package
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .link('typescript')
            .link('@types/node')
            .fixture(directory('./__fixtures__/declarations/'))
            .exec('node_modules/typescript/bin/tsc -p .');

        // Then - every entry's names and types check under each condition, each refusal the consumer expects is one, and the compiler reports nothing
        expect(result.exitCode).toBe(0);
        expect(result.stdout.text).toBe('');
    });
});
