import type { AttestationMessage } from '../primitives/eip712-schema.js';

export type SignedAttestation = AttestationMessage & {
    signature: `0x${string}`;
    signerAddress: `0x${string}`;
};

/** The on-disk shape, JSON-safe: `publishedAt` is a string, since JSON has no bigint. */
export type StoredAttestation = {
    schemaVersion: number;
    subject: {
        title: string;
        contentDigest: `0x${string}`;
        locale: string;
    };
    claims: {
        slug: string;
        publishedAt: string;
        revision: number;
        priorAttestation: `0x${string}`;
    };
    signature: `0x${string}`;
    signerAddress: `0x${string}`;
};
