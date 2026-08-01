import OpenTimestamps from 'javascript-opentimestamps';

const { DetachedTimestampFile, Ops } = OpenTimestamps as {
    DetachedTimestampFile: {
        deserialize: (bytes: Buffer | Uint8Array) => unknown;
        fromHash: (op: unknown, hash: Buffer) => unknown;
    };
    Ops: { OpSHA256: unknown };
    verify: (
        detached: unknown,
        original: unknown,
        options?: unknown,
    ) => Promise<Record<string, { timestamp: number }>>;
};

/**
 * Options for {@link verifyOts}.
 *
 * `explorerUrl` points the Bitcoin block lookup at an alternative Esplora-
 * compatible endpoint (e.g. a self-hosted explorer, or a test stub). When
 * absent the library's default public source is used.
 */
export type OtsVerifyOptions = {
    explorerUrl?: string;
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

/**
 * Verify an OTS proof attests the given digest, and return the Bitcoin block
 * attestation time if present.
 *
 * Network: this calls a Bitcoin block-info source via the OTS library to
 * validate the Merkle path — the library's default public source, or the
 * Esplora-compatible endpoint given in `options.explorerUrl`. In
 * production-paranoid mode you should run your own Bitcoin node and point
 * the explorer option at it.
 */
export async function verifyOts(
    digest: Uint8Array,
    otsBytes: Uint8Array,
    options?: OtsVerifyOptions,
): Promise<OtsVerifyResult> {
    if (digest.length !== 32) {
        return {
            details: `Expected 32-byte digest, got ${digest.length}`,
            ok: false,
            reason: 'digest-mismatch',
        };
    }

    let detached: unknown;
    let original: unknown;
    try {
        detached = DetachedTimestampFile.deserialize(Buffer.from(otsBytes));
        original = DetachedTimestampFile.fromHash(
            new (Ops.OpSHA256 as new () => unknown)(),
            Buffer.from(digest),
        );
    } catch (error) {
        return { details: (error as Error).message, ok: false, reason: 'invalid-proof' };
    }

    // An explicit explorer forces the Esplora path — no local Bitcoin node
    // Probing — so the lookup goes exactly where the caller pointed it.
    // The lib's docs name the flag `ignore_bitcoin_node` but the code checks
    // `ignoreBitcoinNode` — pass both so either side of that drift works.
    // The esplora timeout is documented as seconds but flows straight into
    // Request-promise, which reads milliseconds — so this is 10s, not 10000s.
    const verifyOptions = options?.explorerUrl
        ? {
              esplora: { timeout: 10_000, url: options.explorerUrl },
              ignore_bitcoin_node: true,
              ignoreBitcoinNode: true,
          }
        : undefined;

    let attestations: Record<string, { timestamp: number }>;
    try {
        const ots = OpenTimestamps as unknown as {
            verify: (
                detached: unknown,
                original: unknown,
                options?: unknown,
            ) => Promise<Record<string, { timestamp: number }>>;
        };
        attestations = verifyOptions
            ? await ots.verify(detached, original, verifyOptions)
            : await ots.verify(detached, original);
    } catch (error) {
        return { details: (error as Error).message, ok: false, reason: 'invalid-proof' };
    }

    const bitcoin = attestations['bitcoin'];
    if (bitcoin === undefined) {
        return { ok: false, reason: 'pending-bitcoin' };
    }

    return {
        bitcoinBlockTime: new Date(bitcoin.timestamp * 1000),
        ok: true,
    };
}
