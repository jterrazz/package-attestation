import { defineStubs, http } from '@jterrazz/test/stubs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { parse } from '../../../src/attestation/serialize.js';
import { verifyOts } from '../../../src/ots/verify.js';
import { integration } from '../integration.specification.js';

const SIGNEWS = join(import.meta.dirname, '../../cli/__fixtures__/signews');
const ANCHORED = new Uint8Array(readFileSync(join(SIGNEWS, 'en.ots')));
const ATTESTATION = parse(readFileSync(join(SIGNEWS, 'en.attestation.json'), 'utf8'));
const DIGEST = Buffer.from(ATTESTATION.subject.contentDigest.slice(2), 'hex');

// value: the Bitcoin headers the SigNews proof is anchored in, as blockstream.info answered them on 2026-10-23.
const BLOCKS = [
    [
        948_625,
        '000000000000000000005846c42438750704d2221f5476a87ecb64b14594e142',
        '8e542cdc20de8e372317dfecb19881385fb2e0ccc1e562ed8794cf7128345f6b',
        1_778_338_300,
    ],
    [
        948_647,
        '000000000000000000001b7aa0430e90f8b09860c6b306a94202670d47b0c72f',
        '4ad55ffb9bb6e9de5d55b207640919035f975da00962235b3a10adc148dd63a3',
        1_778_350_449,
    ],
    [
        948_655,
        '0000000000000000000122ccc13957fafe97c0ba77e77fea85f363d99ec71321',
        '95baa8d64c277bec255273a0fe9ac542e64b61fef1851899386127b1c867cba3',
        1_778_353_984,
    ],
] as const;

function explorerAt(origin: string, block: (merkle: string, time: number) => unknown) {
    return defineStubs(
        ...BLOCKS.flatMap(([height, hash, merkle, time]) => [
            {
                request: http.get(`${origin}/block-height/${height}`, {
                    headers: { accept: 'text/plain' },
                }),
                response: http.text(hash),
            },
            {
                request: http.get(`${origin}/block/${hash}`, {
                    headers: { accept: 'application/json' },
                }),
                response: http.json(block(merkle, time)),
            },
        ]),
    );
}

const headers = (merkle: string, time: number): unknown => ({
    merkle_root: merkle,
    timestamp: time,
});

describe('explorer', () => {
    test('a proof is dated on the public explorer when the caller names none, or names an empty one', async () => {
        // Given - the anchored SigNews proof, and blockstream.info answering its blocks
        const result = await integration
            .intercept(explorerAt('https://blockstream.info/api', headers))
            .call(async () => {
                const unnamed = await verifyOts(DIGEST, ANCHORED);
                const empty = await verifyOts(DIGEST, ANCHORED, { explorerUrl: '' });
                return [unnamed, empty].map((verdict) =>
                    verdict.ok ? verdict.bitcoinBlockTime.toISOString() : verdict,
                );
            });

        // Then - its earliest block's time, twice
        expect(result.value).toMatch(['2026-05-09T14:51:40.000Z', '2026-05-09T14:51:40.000Z']);
        expect(result.error.text).toBe('');
    });

    test('a block the explorer answers without its merkle root leaves the proof undated, the explorer named', async () => {
        // Given - an explorer answering each block with its time alone
        const result = await integration
            .intercept(explorerAt('https://esplora.test', (_merkle, time) => ({ timestamp: time })))
            .call(
                async () =>
                    await verifyOts(DIGEST, ANCHORED, { explorerUrl: 'https://esplora.test' }),
            );

        // Then - the first block named, as the reason
        expect(result.value).toMatch({
            details:
                "The explorer's block 000000000000000000005846c42438750704d2221f5476a87ecb64b14594e142 carries no merkle_root and timestamp",
            ok: false,
            reason: 'explorer-unreachable',
        });
        expect(result.error.text).toBe('');
    });

    test('a lookup the explorer drops once is asked again', async () => {
        // Given - an explorer that drops the first lookup of each block, then answers
        const result = await integration
            .intercept([
                ...BLOCKS.map(([height]) => ({
                    request: http.get(`https://esplora.test/block-height/${height}`),
                    response: http.unreachable(),
                    times: 1,
                })),
                ...explorerAt('https://esplora.test', headers).stubs,
            ])
            .call(async () => {
                const verdict = await verifyOts(DIGEST, ANCHORED, {
                    explorerUrl: 'https://esplora.test',
                });
                return verdict.ok ? verdict.bitcoinBlockTime.toISOString() : verdict;
            });

        // Then - the proof dated as if nothing had been dropped
        expect(result.value).toMatch('2026-05-09T14:51:40.000Z');
        expect(result.error.text).toBe('');
    });

    test('an explorer that never answers leaves the proof undated rather than invalid', async () => {
        // Given - an explorer every lookup of which fails in transport
        const result = await integration
            .intercept(http.get(/esplora\.test/u), http.unreachable())
            .call(
                async () =>
                    await verifyOts(DIGEST, ANCHORED, { explorerUrl: 'https://esplora.test' }),
            );

        // Then - the lookup that failed, named
        expect(result.value).toMatch({
            details: 'GET https://esplora.test/block-height/948625: TypeError: Network error',
            ok: false,
            reason: 'explorer-unreachable',
        });
        expect(result.error.text).toBe('');
    });
});
