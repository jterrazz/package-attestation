import { file } from '@jterrazz/test';
import { defineStubs, http } from '@jterrazz/test/stubs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { upgradeProof } from '../../../src/ots/stamp.js';
import { verifyOts } from '../../../src/ots/verify.js';
import { integration } from '../integration.specification.js';

// value: the Bitcoin headers the vectors are anchored in, as blockstream.info answered them on 2026-10-23.
const BLOCKS = [
    [
        129_405,
        '0000000000000b4ad5e27dd5024232e2de475cbafd484744bf92228e7a7c7941',
        'db29fdc2c27a1531ae08a9dff2d9e4dfedd9c902d16de542d8666a27367e5b71',
        1_307_549_734,
    ],
    [
        358_391,
        '000000000000000003e892881a8cdcdc117c06d444057c98b6f04a9ee75a2319',
        '8a1b66ecb7cbd07d8139a7e7d7f2c41aab1f5009b8364aaf61d03ad245e47e00',
        1_432_827_678,
    ],
    [
        455_605,
        '00000000000000000264b495946e8dccbb6e201e6f00d017a9eb1b82a6952c1e',
        '2a19192cf00fb1baeea516b69b3a62195849589b4caafeb6ad6ebba58b9ae69a',
        1_488_561_937,
    ],
    [
        466_906,
        '00000000000000000144a7d035e1fc7ea8eef8ee0145cc82c9dd9d451d5e31ad',
        '40c9303a5cb0a8c4b2676f4c6b101d37f83e9413f3856f356849bfb9438a7c26',
        1_495_071_945,
    ],
    [
        523_364,
        '0000000000000000000f49c7974b6428fda85bf90c481bca914dc1a9adebe764',
        '3c4fe7e01d8a73acbef3cbf6269d53f21eeffba8afab0fea5e78e7a053077839',
        1_526_719_849,
    ],
] as const;

const network = defineStubs(
    ...BLOCKS.flatMap(([height, hash, merkle, time]) => [
        {
            request: http.get(`https://esplora.test/block-height/${height}`),
            response: http.text(hash),
        },
        {
            request: http.get(`https://esplora.test/block/${hash}`),
            response: http.json({ merkle_root: merkle, timestamp: time }),
        },
    ]),
    { request: http.get(/\/timestamp\/[\da-f]+$/u), response: http.unreachable() },
);

// invariant: each golden was written by javascript-opentimestamps 0.4.5 through @jterrazz/attestation 0.3.1, the client this one replaced, and is frozen. Two depart from it on purpose: `different-blockchains.txt` and `hello-world.txt.eth` carry an Ethereum attestation, which 0.3.1 failed by asking a local Ethereum node and which this client skips, as it skips any notary it does not read.
const CASES = [
    'a.sha1',
    'bad-stamp.txt',
    'different-blockchains.txt',
    'empty',
    'hello-world.txt',
    'hello-world.txt.eth',
    'incomplete.txt',
    'known-and-unknown-notary.txt',
    'merkle1.txt',
    'merkle2.txt',
    'merkle3.txt',
    'osdsp.txt',
    'readme.ripemd160',
    'two-calendars.txt',
    'unknown-notary.txt',
].map((name) => ({ name }));

describe('reference-client', () => {
    test.each(CASES)(
        // Given - an upstream OpenTimestamps vector, the file it proves, its blocks on an explorer double and every calendar unreachable
        // Then - its digest, its bytes written back unchanged, and the verdicts the reference client gave
        '$name reads, writes back and verifies as the reference client did',
        async ({ name }) => {
            const result = await integration.intercept(network).call(async () => await read(name));

            expect(result.value).toMatch(file(`./__expected__/${name}.json`), { frozen: true });
            expect(result.error.text).toBe('');
        },
    );
});

async function read(name: string): Promise<unknown> {
    const proof = new Uint8Array(
        readFileSync(join(import.meta.dirname, `./__fixtures__/${name}.ots`)),
    );
    const hash = hashOf(name);
    const original = readFileSync(join(import.meta.dirname, `./__fixtures__/${name}.original`));
    const digest = new Uint8Array(createHash(hash).update(original).digest());
    const upgrade = await upgradeProof(proof);
    const verdict = await verifyOts(digest, proof, { explorerUrl: 'https://esplora.test' });
    const same = Buffer.from(upgrade.bytes).equals(proof);
    return {
        digest: Buffer.from(digest).toString('hex'),
        hash,
        roundTrip: same,
        upgrade: { same, upgraded: upgrade.upgraded },
        verdict: verdict.ok
            ? { ...verdict, bitcoinBlockTime: verdict.bitcoinBlockTime.toISOString() }
            : verdict,
    };
}

function hashOf(name: string): 'ripemd160' | 'sha1' | 'sha256' {
    if (name.endsWith('.sha1')) {
        return 'sha1';
    }
    return name.endsWith('.ripemd160') ? 'ripemd160' : 'sha256';
}
