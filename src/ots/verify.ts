import { hexToBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'node:buffer';

import { messageOf } from '../primitives/error-message.js';
import { blockAt, PUBLIC_ESPLORA } from './esplora.js';
import { proofFileOf } from './proof-file.js';
import { attestationsOf } from './timestamp.js';
import type { Attested, Timestamp } from './timestamp.js';
import { upgradeTimestamp } from './upgrade.js';

export type OtsVerifyOptions = {
    /** An Esplora-compatible explorer the Bitcoin block lookup asks instead of the public default: a node of your own, or a double. */
    explorerUrl?: string | undefined;
};

export type OtsVerifyOk = {
    ok: true;
    bitcoinBlockTime: Date;
};

export type OtsVerifyFail = {
    ok: false;
    reason: 'digest-mismatch' | 'invalid-proof' | 'pending-bitcoin';
    details?: string;
};

export type OtsVerifyResult = OtsVerifyFail | OtsVerifyOk;

/** Verifies that a proof attests the digest, and returns the time of the earliest Bitcoin block that anchors it; the block is looked up on the network. */
export async function verifyOts(
    digest: Uint8Array,
    otsBytes: Uint8Array,
    options: OtsVerifyOptions = {},
): Promise<OtsVerifyResult> {
    if (digest.length !== 32) {
        return {
            details: `Expected 32-byte digest, got ${digest.length}`,
            ok: false,
            reason: 'digest-mismatch',
        };
    }

    try {
        const { timestamp } = proofFileOf(otsBytes);
        if (!Buffer.from(timestamp.message).equals(digest)) {
            throw new Error('File does not match original!');
        }
        await upgradeTimestamp(timestamp);
        const explorer = options.explorerUrl ?? '';
        const time = await bitcoinTimeOf(timestamp, explorer === '' ? PUBLIC_ESPLORA : explorer);
        if (time === undefined) {
            return { ok: false, reason: 'pending-bitcoin' };
        }
        return { bitcoinBlockTime: new Date(time * 1000), ok: true };
    } catch (error) {
        return { details: messageOf(error), ok: false, reason: 'invalid-proof' };
    }
}

// invariant: every Bitcoin attestation is checked, in the order of the tree, before the first that fails is reported, so a proof is never dated by a block when another block refutes it.
async function bitcoinTimeOf(root: Timestamp, explorer: string): Promise<number | undefined> {
    const times: number[] = [];
    const failures: string[] = [];
    for (const attested of attestationsOf(root)) {
        if (attested.attestation.kind !== 'bitcoin') {
            continue;
        }
        await blockTimeOf(attested, attested.attestation.height, explorer).then(
            (time) => times.push(time),
            (error: unknown) => failures.push(messageOf(error)),
        );
    }
    if (failures.length > 0) {
        throw new Error(`bitcoin verification failed: ${failures[0]}`);
    }
    return times.length === 0 ? undefined : Math.min(...times);
}

async function blockTimeOf(
    { message }: Attested,
    height: number,
    explorer: string,
): Promise<number> {
    const block = await blockAt(explorer, height);
    if (!Buffer.from(message.toReversed()).equals(hexToBytes(block.merkleRoot))) {
        throw new Error('Digest does not match merkleroot');
    }
    return block.time;
}
