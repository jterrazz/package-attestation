import { describe, expect, test } from 'vitest';

import { bytesOfProofFile, proofFileOf } from '../../../src/ots/proof-file.js';
import { integration } from '../integration.specification.js';
import {
    ALICE,
    bitcoin,
    BOB,
    bytesOf,
    HEADER,
    pendingOn,
    varbytes,
} from './__setup__/ots-grammar.js';

const CASES = [
    { bytes: bitcoin(16_384), name: 'a block height whose varuint holds a 0x80 byte' },
    { bytes: bitcoin(127), name: 'the largest one-byte varuint' },
    { bytes: `f0 01aa ${pendingOn(ALICE)}`, name: 'an append of one byte' },
    {
        bytes: `f0 ${varbytes('ab'.repeat(4064))} 08 ${bitcoin(1)}`,
        name: 'an operation whose result is 4096 bytes',
    },
    { bytes: pendingOn(`https://${'a'.repeat(992)}`), name: 'a calendar URI of 1000 characters' },
    {
        bytes: pendingOn('https://a1.calendar.opentimestamps.org'),
        name: 'a calendar URI holding a digit',
    },
    {
        bytes: `ff ${bitcoin(948_625)} ${pendingOn(BOB)}`,
        name: 'a block before a calendar on one node',
    },
    {
        bytes: `ff ${bitcoin(1000)} ${bitcoin(948_625)}`,
        name: 'two blocks on one node, the lower first',
    },
    {
        bytes: `ff ${pendingOn(ALICE)} ${pendingOn(BOB)}`,
        name: 'two calendars on one node, by URI',
    },
    {
        bytes: `ff ${bitcoin(1)} 00 aabbccddeeff0011 04deadbeef`,
        name: 'a notary this client does not read',
    },
    {
        bytes: `ff ${pendingOn(ALICE)} f1 02cafe 08 ${bitcoin(2)}`,
        name: 'an attestation before an operation',
    },
];

describe('round-trip', () => {
    test.each(CASES)(
        // Given - a proof of $name, written by hand
        // Then - read and written back, the same bytes
        'writes back $name as it read it',
        async ({ bytes }) => {
            const result = await integration.call(() => {
                const proof = bytesOf(`${HEADER}${bytes}`);
                return Buffer.from(bytesOfProofFile(proofFileOf(proof))).toString('hex');
            });

            expect(result.value.text).toBe(bytesOf(`${HEADER}${bytes}`).toString('hex'));
            expect(result.error.text).toBe('');
        },
    );
});
