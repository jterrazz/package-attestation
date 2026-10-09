declare module 'javascript-opentimestamps' {
    export type DetachedTimestampFile = {
        serializeToBytes: () => Uint8Array;
        timestamp: { getAttestations: () => Set<unknown> };
    };

    export type OpSHA256 = {
        _DIGEST_LENGTH: () => number;
    };

    type VerifyOptions = {
        esplora?: { timeout: number; url: string };
        ignoreBitcoinNode?: boolean;
    };

    const OpenTimestamps: {
        DetachedTimestampFile: {
            deserialize: (bytes: Uint8Array) => DetachedTimestampFile;
            fromHash: (op: OpSHA256, digest: Uint8Array) => DetachedTimestampFile;
        };
        Ops: { OpSHA256: new () => OpSHA256 };
        stamp: (detached: DetachedTimestampFile) => Promise<void>;
        upgrade: (detached: DetachedTimestampFile) => Promise<boolean>;
        verify: (
            stamped: DetachedTimestampFile,
            original: DetachedTimestampFile,
            options: VerifyOptions,
        ) => Promise<Record<string, undefined | { height: number; timestamp: number }>>;
    };

    export default OpenTimestamps;
}
