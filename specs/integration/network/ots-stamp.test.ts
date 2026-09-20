import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';

import { stampDigest } from '../../../src/ots/stamp.js';
import { verifyOts } from '../../../src/ots/verify.js';
import { integration } from '../integration.specification.js';

/**
 * The live OpenTimestamps calendar — the one suite that leaves the machine.
 * `vitest.config.ts` collects this folder only when ATTEST_E2E_NETWORK is
 * set, which `npm run test:network` is the one command to do.
 *
 * Nothing here can be goldened: the proof a calendar returns is new on every
 * run, and a fresh digest is precisely what keeps the calendar clean.
 */

test('a fresh digest comes back stamped, and pending its Bitcoin attestation', async () => {
    // Given - a digest no calendar has seen, submitted to the real ones
    const result = await integration.call(async () => {
        const unique = `attestation-package-test-${Date.now()}-${Math.random()}`;
        const digest = new Uint8Array(createHash('sha256').update(unique).digest());
        const proof = await stampDigest(digest);
        const verdict = await verifyOts(digest, proof);

        return {
            proofLength: proof.length,
            reason: verdict.ok ? null : verdict.reason,
            verified: verdict.ok,
        };
    });

    // Then - a non-empty proof that carries calendar attestations only
    expect(result.value.value.proofLength).toBeGreaterThan(0);
    expect(result.value.value.verified).toBe(false);
    expect(result.value.value.reason).toBe('pending-bitcoin');
    await expect(result.error).toBeEmpty();
}, 30_000);
