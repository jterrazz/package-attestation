import { http } from '@jterrazz/test/stubs';
import { describe, expect, test } from 'vitest';

import { submitDigest, timestampFrom } from '../../../src/ots/calendar.js';
import { integration } from '../integration.specification.js';

const DIGEST = new Uint8Array(32).fill(0xab);
const HEADERS = {
    accept: 'application/vnd.opentimestamps.v1',
    'user-agent': '@jterrazz/attestation',
};
const ASKED = `https://alice.btc.calendar.opentimestamps.org/timestamp/${'ab'.repeat(32)}`;

describe('calendars', () => {
    test('a digest is posted to the calendar, and a calendar that refuses it is reported', async () => {
        // Given - an aggregator answering 503 to the submission it is sent
        const result = await integration
            .intercept(
                http.post('https://a.pool.opentimestamps.org/digest', {
                    headers: { ...HEADERS, 'content-type': 'application/x-www-form-urlencoded' },
                }),
                http.error(503),
            )
            .call(async () => await submitDigest('https://a.pool.opentimestamps.org', DIGEST));

        // Then - the request and the status it met
        expect(result.error).toMatch('POST https://a.pool.opentimestamps.org/digest: HTTP 503');
    });

    test('a calendar answering more than a timestamp may weigh is refused', async () => {
        // Given - a calendar answering 10001 bytes for a commitment
        const result = await integration
            .intercept(http.get(ASKED, { headers: HEADERS }), http.text('x'.repeat(10_001)))
            .call(
                async () =>
                    await timestampFrom('https://alice.btc.calendar.opentimestamps.org', DIGEST),
            );

        // Then - the answer refused by its size
        expect(result.error).toMatch(`GET ${ASKED}: RangeError: answered more than 10000 bytes`);
    });

    test('a calendar answering bytes that are no timestamp is refused', async () => {
        // Given - a calendar answering 10000 bytes of text for a commitment, the most an answer may weigh
        const result = await integration
            .intercept(http.get(ASKED, { headers: HEADERS }), http.text('x'.repeat(10_000)))
            .call(
                async () =>
                    await timestampFrom('https://alice.btc.calendar.opentimestamps.org', DIGEST),
            );

        // Then - the answer refused as no timestamp
        expect(result.error).toMatch('The bytes do not read as an OpenTimestamps timestamp.');
    });
});
