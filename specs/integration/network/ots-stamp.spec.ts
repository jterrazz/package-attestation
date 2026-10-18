import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';

import { stampDigest } from '../../../src/ots/stamp.js';
import { verifyOts } from '../../../src/ots/verify.js';
import { integration } from '../integration.specification.js';

// outside: the live OpenTimestamps calendars. This is the one suite that leaves the machine, collected only under ATTEST_E2E_NETWORK (`make test-network`); a calendar's proof is new on every run, so nothing here is goldened.
describe('ots-stamp', () => {
    test('a fresh digest comes back stamped, and pending its Bitcoin attestation', async () => {
        // Given - a digest no calendar has seen, submitted to the real ones
        const result = await integration.call(async () => {
            const digest = new Uint8Array(
                createHash('sha256').update(`attestation-${process.hrtime.bigint()}`).digest(),
            );
            const proof = await stampDigest(digest);
            const verdict = await verifyOts(digest, proof);
            return { stamped: proof.length > 0, verdict };
        });

        // Then - a proof that carries calendar attestations only
        expect(result.value).toMatch({
            stamped: true,
            verdict: { ok: false, reason: 'pending-bitcoin' },
        });
        expect(result.error.text).toBe('');
    }, 30_000);
});
