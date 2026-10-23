import { defineStubs, http } from '@jterrazz/test/stubs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';

import { parse } from '../../../src/attestation/serialize.js';
import { bytesOfProofFile, proofFileOf, proofFileOfDigest } from '../../../src/ots/proof-file.js';
import { ProofReader } from '../../../src/ots/proof-reader.js';
import { merge, readTimestamp } from '../../../src/ots/timestamp.js';
import type { Timestamp } from '../../../src/ots/timestamp.js';
import { upgradeTimestamp } from '../../../src/ots/upgrade.js';
import { verifyOts } from '../../../src/ots/verify.js';
import { integration } from '../integration.specification.js';

const SIGNEWS = join(import.meta.dirname, '../../cli/__fixtures__/signews');
const ANCHORED = readFileSync(join(SIGNEWS, 'en.ots'));
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

const explorer = defineStubs(
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
);

const ALICE = 'alice.btc.calendar.opentimestamps.org';
const BOB = 'bob.btc.calendar.opentimestamps.org';
const EVERY_CALENDAR = [
    ALICE,
    BOB,
    'btc.calendar.catallaxy.com',
    'finney.calendar.eternitywall.com',
];

// invariant: each answer is what the calendar served on 2026-10-23 for the commitment the SigNews proof is pending on; javascript-opentimestamps 0.4.5, given the same answers, wrote the anchored proof byte for byte.
function calendarsAnswering(...hosts: string[]) {
    return async (calendar: string, commitment: Uint8Array): Promise<Timestamp> => {
        const host = new URL(calendar).hostname;
        if (!hosts.includes(host)) {
            throw new Error(`${host} is down`);
        }
        const answer = readFileSync(join(import.meta.dirname, `./__fixtures__/${host}.answer`));
        return readTimestamp(new ProofReader(answer), commitment);
    };
}

function calendarOnly(): ReturnType<typeof proofFileOf> {
    return proofFileOf(readFileSync(join(import.meta.dirname, './__fixtures__/calendar-only.ots')));
}

async function upgradedByEveryCalendar(): Promise<unknown> {
    const proof = calendarOnly();
    const upgraded = await upgradeTimestamp(proof.timestamp, calendarsAnswering(...EVERY_CALENDAR));
    const bytes = bytesOfProofFile(proof);
    const verdict = await verifyOts(DIGEST, bytes, { explorerUrl: 'https://esplora.test' });
    return {
        anchored: Buffer.from(bytes).equals(ANCHORED),
        upgraded,
        verdict: verdict.ok ? verdict.bitcoinBlockTime.toISOString() : verdict,
    };
}

describe('calendars', () => {
    test('a calendar-only proof upgraded with the calendars answers becomes the anchored proof, dated by its earliest block', async () => {
        // Given - the SigNews proof as the calendars first answered it, each calendar now holding its Bitcoin attestation
        const result = await integration.intercept(explorer).call(upgradedByEveryCalendar);

        // Then - the bytes of the anchored proof, and its date
        expect(result.value).toMatch({
            anchored: true,
            upgraded: true,
            verdict: '2026-05-09T14:51:40.000Z',
        });
        expect(result.error.text).toBe('');
    });

    test('an answer that attests only a block the proof already names is no upgrade, and each calendar is reported', async () => {
        // Given - the calendar-only proof upgraded by alice alone, then by bob alone, both anchored in block 948625, then by no calendar
        const result = await integration.call(async () => {
            const proof = calendarOnly();
            return await logged(async () => [
                await upgradeTimestamp(proof.timestamp, calendarsAnswering(ALICE)),
                await upgradeTimestamp(proof.timestamp, calendarsAnswering(BOB)),
                await upgradeTimestamp(proof.timestamp, calendarsAnswering()),
            ]);
        });

        // Then - only alice's answer upgraded the proof, and every calendar asked said what it answered
        expect(result.value).toMatch({
            lines: [
                `Got 1 attestation(s) from https://${ALICE}`,
                `Calendar https://${BOB}: ${BOB} is down`,
                'Calendar https://finney.calendar.eternitywall.com: finney.calendar.eternitywall.com is down',
                'Calendar https://btc.calendar.catallaxy.com: btc.calendar.catallaxy.com is down',
                `Got 1 attestation(s) from https://${BOB}`,
                'Calendar https://finney.calendar.eternitywall.com: finney.calendar.eternitywall.com is down',
                'Calendar https://btc.calendar.catallaxy.com: btc.calendar.catallaxy.com is down',
                'Calendar https://finney.calendar.eternitywall.com: finney.calendar.eternitywall.com is down',
                'Calendar https://btc.calendar.catallaxy.com: btc.calendar.catallaxy.com is down',
            ],
            value: [true, false, false],
        });
        expect(result.error.text).toBe('');
    });

    test('an answer that attests a known block and a new one is an upgrade', async () => {
        // Given - the proof upgraded by alice, then by a bob that names block 948625 and a block the proof lacks
        const result = await integration.call(async () => {
            const proof = calendarOnly();
            await upgradeTimestamp(proof.timestamp, calendarsAnswering(ALICE));
            return await upgradeTimestamp(proof.timestamp, async (calendar, commitment) => {
                const answer = await calendarsAnswering(BOB)(calendar, commitment);
                answer.attestations.push({ height: 948_700, kind: 'bitcoin' });
                return answer;
            });
        });

        // Then - the new block upgrades it
        expect(result.value).toMatch(true);
        expect(result.error.text).toBe('');
    });

    test('a proof merged into itself is unchanged', async () => {
        // Given - the anchored proof, and the same proof read a second time
        const result = await integration.call(() => {
            const proof = proofFileOf(ANCHORED);
            merge(proof.timestamp, proofFileOf(ANCHORED).timestamp);
            return { unchanged: Buffer.from(bytesOfProofFile(proof)).equals(ANCHORED) };
        });

        // Then - each attestation and each operation kept once
        expect(result.value).toMatch({ unchanged: true });
        expect(result.error.text).toBe('');
        expect(result.error.text).toBe('');
    });

    test.each([
        { asked: true, uri: `https://${ALICE}` },
        { asked: true, uri: 'https://finney.calendar.eternitywall.com' },
        { asked: true, uri: 'https://btc.calendar.catallaxy.com' },
        { asked: false, uri: `https://${ALICE}.evil.test` },
        { asked: false, uri: 'https://finney.calendar.eternitywall.com.evil.test' },
        { asked: false, uri: 'https://btc.calendar.catallaxy.com.evil.test' },
        { asked: false, uri: `https://evil.test/https://${ALICE}` },
        { asked: false, uri: 'https://evil.test/https://finney.calendar.eternitywall.com' },
        { asked: false, uri: 'https://evil.test/https://btc.calendar.catallaxy.com' },
        { asked: false, uri: 'https://.calendar.opentimestamps.org' },
    ])(
        // Given - a proof pending on $uri
        // Then - the calendar asked only when the whitelist holds it
        'a proof pending on $uri asks it: $asked',
        async ({ asked, uri }) => {
            const result = await integration.call(async () => {
                const proof = proofFileOfDigest(DIGEST);
                proof.timestamp.attestations.push({ kind: 'pending', uri });
                const calendars: string[] = [];
                await upgradeTimestamp(proof.timestamp, async (calendar) => {
                    calendars.push(calendar);
                    throw new Error('down');
                });
                return calendars.length > 0;
            });

            expect(result.value).toMatch(asked);
            expect(result.error.text).toBe('');
        },
    );
});

async function logged<T>(run: () => Promise<T>): Promise<{ lines: string[]; value: T }> {
    const lines: string[] = [];
    const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        lines.push(String(chunk).trimEnd());
        return true;
    });
    try {
        return { lines, value: await run() };
    } finally {
        write.mockRestore();
    }
}
