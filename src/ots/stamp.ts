import OpenTimestamps from 'javascript-opentimestamps';

import { proofFileOf } from './proof-file.js';

const { DetachedTimestampFile, Ops } = OpenTimestamps;

/** Submits a SHA-256 digest to the OpenTimestamps calendars and returns its proof, calendar-only until `upgradeProof` anchors it in a Bitcoin block, about a day later. */
export async function stampDigest(digest: Uint8Array): Promise<Uint8Array> {
    if (digest.length !== 32) {
        throw new Error(`Expected 32-byte SHA-256 digest, got ${digest.length} bytes`);
    }

    const detached = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), digest);
    await OpenTimestamps.stamp(detached);
    // outside: the library resolves even when every calendar failed, with a proof that attests nothing.
    // Stryker disable next-line ConditionalExpression: a stamp some calendar answered is reached only with the live calendars (make test-network)
    if (detached.timestamp.getAttestations().size === 0) {
        throw new Error('No OpenTimestamps calendar answered: the proof would attest nothing.');
    }
    return new Uint8Array(detached.serializeToBytes());
}

/** Asks the calendars for the Bitcoin attestation of a calendar-only proof: the proof, and whether one was attached this time. */
export async function upgradeProof(
    otsBytes: Uint8Array,
): Promise<{ bytes: Uint8Array; upgraded: boolean }> {
    const detached = proofFileOf(otsBytes);
    const upgraded = await OpenTimestamps.upgrade(detached);
    return { bytes: new Uint8Array(detached.serializeToBytes()), upgraded };
}
