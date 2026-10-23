import { randomBytes } from 'node:crypto';

import { AGGREGATORS, submitDigest } from './calendar.js';
import { bytesOfProofFile, proofFileOf, proofFileOfDigest } from './proof-file.js';
import { attestationsOf, followed, merge } from './timestamp.js';
import type { Timestamp } from './timestamp.js';
import { upgradeTimestamp } from './upgrade.js';

/** Submits a SHA-256 digest to the OpenTimestamps calendars and returns its proof, calendar-only until `upgradeProof` anchors it in a Bitcoin block, about a day later. */
export async function stampDigest(digest: Uint8Array): Promise<Uint8Array> {
    return await stampWith(digest, submitDigest);
}

/** Stamps a digest with the calendars' answers as `submit` gets them. */
export async function stampWith(
    digest: Uint8Array,
    submit: (calendar: string, message: Uint8Array) => Promise<Timestamp>,
): Promise<Uint8Array> {
    if (digest.length !== 32) {
        throw new Error(`Expected 32-byte SHA-256 digest, got ${digest.length} bytes`);
    }

    const proof = proofFileOfDigest(digest);
    // invariant: a random nonce is appended before the digest leaves, so a calendar never learns the digest it is asked to anchor.
    const tip = followed(followed(proof.timestamp, { arg: randomBytes(16), name: 'append' }), {
        name: 'sha256',
    });
    const answers = await Promise.all(
        AGGREGATORS.map(async (calendar): Promise<Timestamp | undefined> => {
            process.stdout.write(`Submitting to remote calendar ${calendar}\n`);
            return await submit(calendar, tip.message).catch(() => undefined);
        }),
    );
    for (const answer of answers) {
        if (answer !== undefined) {
            merge(tip, answer);
        }
    }
    if (attestationsOf(proof.timestamp).length === 0) {
        throw new Error('No OpenTimestamps calendar answered: the proof would attest nothing.');
    }
    return bytesOfProofFile(proof);
}

/** Asks the calendars for the Bitcoin attestation of a calendar-only proof: the proof, and whether one was attached this time. */
export async function upgradeProof(
    otsBytes: Uint8Array,
): Promise<{ bytes: Uint8Array; upgraded: boolean }> {
    const proof = proofFileOf(otsBytes);
    const upgraded = await upgradeTimestamp(proof.timestamp);
    return { bytes: bytesOfProofFile(proof), upgraded };
}
