import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { upgradeProof } from '../../../src/ots/stamp.js';
import { integration } from '../integration.specification.js';

// outside: the live OpenTimestamps calendars, collected only under ATTEST_E2E_NETWORK (`make test-network`).
describe('ots-upgrade', () => {
    test('the calendar-only SigNews proof upgraded on the live calendars is the anchored proof', async () => {
        // Given - the SigNews proof as the calendars first answered it, asked of the calendars it is pending on
        const result = await integration.call(async () => {
            const calendarOnly = readFileSync(
                join(import.meta.dirname, '../upgrade/__fixtures__/calendar-only.ots'),
            );
            const anchored = readFileSync(
                join(import.meta.dirname, '../../cli/__fixtures__/signews/en.ots'),
            );
            const { bytes, upgraded } = await upgradeProof(new Uint8Array(calendarOnly));
            return { anchored: Buffer.from(bytes).equals(anchored), upgraded };
        });

        // Then - every calendar's answer merged in, byte for byte the proof javascript-opentimestamps wrote
        expect(result.value).toMatch({ anchored: true, upgraded: true });
        expect(result.error.text).toBe('');
    }, 30_000);
});
