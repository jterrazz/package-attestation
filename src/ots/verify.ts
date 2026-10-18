import OpenTimestamps from 'javascript-opentimestamps';

import { messageOf } from '../primitives/error-message.js';
import { proofFileOf } from './proof-file.js';

const { DetachedTimestampFile, Ops } = OpenTimestamps;

export type OtsVerifyOptions = {
    /** An Esplora-compatible explorer the Bitcoin block lookup asks instead of the library's public default: a node of your own, or a double. */
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
        const stamped = proofFileOf(otsBytes);
        const original = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), digest);
        const { bitcoin } = await OpenTimestamps.verify(
            stamped,
            original,
            explorerOptions(options),
        );
        if (bitcoin === undefined) {
            return { ok: false, reason: 'pending-bitcoin' };
        }
        return { bitcoinBlockTime: new Date(bitcoin.timestamp * 1000), ok: true };
    } catch (error) {
        return { details: messageOf(error), ok: false, reason: 'invalid-proof' };
    }
}

// Stryker disable StringLiteral,ConditionalExpression,BlockStatement: without an explorer the library asks a local Bitcoin node, then the public explorer, both on the network, which no offline spec reaches; the two paths differ only there
function explorerOptions({ explorerUrl = '' }: OtsVerifyOptions): object {
    if (explorerUrl === '') {
        return {};
    }
    // Stryker restore all
    // outside: the library reads `ignoreBitcoinNode` (its docs say `ignore_bitcoin_node`), and its explorer timeout, documented in seconds, reaches its HTTP client as milliseconds (10 s).
    // Stryker disable next-line BooleanLiteral: the library's local-node lookup is dead today (its readBitcoinConf reads array indices, never a file), so the flag changes nothing yet; it keeps a fixed library from asking a local node before the explorer named
    return { esplora: { timeout: 10_000, url: explorerUrl }, ignoreBitcoinNode: true };
}
