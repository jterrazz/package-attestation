import { describe, expect, test } from 'vitest';

import { proofFileOf } from '../../../src/ots/proof-file.js';
import { integration } from '../integration.specification.js';
import {
    ALICE,
    ascii,
    bitcoin,
    bytesOf,
    HEADER,
    MAGIC,
    pendingOn,
    varbytes,
} from './__setup__/ots-grammar.js';

const CASES = [
    { bytes: `${HEADER} ${bitcoin(1)} 00`, name: 'a byte past the timestamp' },
    { bytes: `${MAGIC} 02 08 ${'00'.repeat(32)} ${bitcoin(1)}`, name: 'a version 2 file' },
    {
        bytes: `${MAGIC} 01 09 ${'00'.repeat(32)} ${bitcoin(1)}`,
        name: 'a file hash it does not know',
    },
    { bytes: `${HEADER} f2 01aa ${pendingOn(ALICE)}`, name: 'an operation it does not know' },
    { bytes: `${HEADER} f0 00 ${pendingOn(ALICE)}`, name: 'an append of nothing' },
    {
        bytes: `${HEADER} f0 ${varbytes('ab'.repeat(4065))} 08 ${bitcoin(1)}`,
        name: 'an operation whose result passes 4096 bytes',
    },
    {
        bytes: `${HEADER} ${pendingOn(`https://${'a'.repeat(993)}`)}`,
        name: 'a calendar URI of 1001 characters',
    },
    {
        bytes: `${HEADER} ${pendingOn('https://a_b.calendar.opentimestamps.org')}`,
        name: 'a calendar URI holding an underscore',
    },
    {
        bytes: `${HEADER} ${pendingOn(' https://a.calendar.opentimestamps.org')}`,
        name: 'a calendar URI opening on a space',
    },
    {
        bytes: `${HEADER} ${pendingOn('https://a.calendar.opentimestamps.org ')}`,
        name: 'a calendar URI closing on a space',
    },
    {
        bytes: `${HEADER} 00 0588960d73d71901 020100`,
        name: 'a block attestation carrying a byte past its height',
    },
    {
        bytes: `${HEADER} 00 83dfe30d2ef90c8e 32 09${ascii('https://a')}`,
        name: 'an attestation longer than the bytes left',
    },
];

describe('refusals', () => {
    test.each(CASES)(
        // Given - $name, written by hand
        // Then - the bytes refused as no proof
        'refuses $name',
        async ({ bytes }) => {
            const result = await integration.call(() => {
                proofFileOf(bytesOf(bytes));
                return 'read';
            });

            expect(result.error).toMatch(
                'Not an OpenTimestamps proof: the bytes do not read as a detached timestamp file.',
            );
        },
    );
});
