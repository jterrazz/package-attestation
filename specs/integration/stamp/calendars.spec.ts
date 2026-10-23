import { defineStubs, http } from '@jterrazz/test/stubs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { proofFileOf } from '../../../src/ots/proof-file.js';
import { ProofReader } from '../../../src/ots/proof-reader.js';
import { stampWith } from '../../../src/ots/stamp.js';
import { attestationsOf, readTimestamp } from '../../../src/ots/timestamp.js';
import type { Timestamp } from '../../../src/ots/timestamp.js';
import { verifyOts } from '../../../src/ots/verify.js';
import { integration } from '../integration.specification.js';

const DIGEST = new Uint8Array(createHash('sha256').update('stamped').digest());

const calendars = defineStubs({
    request: http.get(/\/timestamp\/[\da-f]+$/u),
    response: http.unreachable(),
});

// invariant: each answer is what the aggregator served on 2026-10-23 for a digest submitted to it.
function aggregatorsAnswering(...hosts: string[]) {
    return async (calendar: string, message: Uint8Array): Promise<Timestamp> => {
        const host = new URL(calendar).hostname;
        if (!hosts.includes(host)) {
            throw new Error(`${host} is down`);
        }
        const answer = readFileSync(join(import.meta.dirname, `./__fixtures__/${host}.digest`));
        return readTimestamp(new ProofReader(answer), message);
    };
}

async function stamped(...hosts: string[]): Promise<{ calendars: string[]; verdict: unknown }> {
    const bytes = await stampWith(DIGEST, aggregatorsAnswering(...hosts));
    const calendarsOf = attestationsOf(proofFileOf(bytes).timestamp).map(({ attestation }) =>
        attestation.kind === 'pending' ? attestation.uri : attestation.kind,
    );
    return { calendars: calendarsOf, verdict: await verifyOts(DIGEST, bytes) };
}

describe('calendars', () => {
    test('a digest every aggregator answered is pending on each of their calendars', async () => {
        // Given - the four aggregators answering, and every calendar unreachable when the proof is verified
        const result = await integration
            .intercept(calendars)
            .call(
                async () =>
                    await stamped(
                        'a.pool.opentimestamps.org',
                        'b.pool.opentimestamps.org',
                        'a.pool.eternitywall.com',
                        'ots.btc.catallaxy.com',
                    ),
            );

        // Then - one promise per calendar, and no Bitcoin block yet
        expect(result.value).toMatch({
            calendars: [
                'https://alice.btc.calendar.opentimestamps.org',
                'https://bob.btc.calendar.opentimestamps.org',
                'https://finney.calendar.eternitywall.com',
                'https://btc.calendar.catallaxy.com',
            ],
            verdict: { ok: false, reason: 'pending-bitcoin' },
        });
        expect(result.error.text).toBe('');
    });

    test('a digest one aggregator answered is stamped by it alone', async () => {
        // Given - only one aggregator answering
        const result = await integration
            .intercept(calendars)
            .call(async () => await stamped('b.pool.opentimestamps.org'));

        // Then - the one calendar it forwards to
        expect(result.value).toMatch({
            calendars: ['https://bob.btc.calendar.opentimestamps.org'],
            verdict: { ok: false, reason: 'pending-bitcoin' },
        });
        expect(result.error.text).toBe('');
    });
});
