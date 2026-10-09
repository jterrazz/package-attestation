// invariant: frozen — every byte of the domain and the types is part of the digest each v1 signature was taken over; a v2 is added beside with a new SCHEMA_VERSION, verified by dispatching on schemaVersion, and v1's verifier stays.

export const ATTESTATION_DOMAIN_V1 = {
    chainId: 1,
    name: 'jterrazz.com Article Attestation',
    version: '1',
} as const;

export const ATTESTATION_TYPES_V1 = {
    Attestation: [
        { name: 'schemaVersion', type: 'uint16' },
        { name: 'subject', type: 'ArticleSubject' },
        { name: 'claims', type: 'ArticleClaims' },
    ],
    ArticleClaims: [
        { name: 'slug', type: 'string' },
        { name: 'publishedAt', type: 'uint64' },
        { name: 'revision', type: 'uint16' },
        { name: 'priorAttestation', type: 'bytes32' },
    ],
    ArticleSubject: [
        { name: 'title', type: 'string' },
        { name: 'contentDigest', type: 'bytes32' },
        { name: 'locale', type: 'string' },
    ],
} as const;

export const ATTESTATION_PRIMARY_TYPE = 'Attestation' as const;

/** The `priorAttestation` of a first revision: 32 zero bytes. */
export const NO_PRIOR_ATTESTATION =
    '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export type ArticleSubject = {
    title: string;
    contentDigest: `0x${string}`;
    locale: string;
};

export type ArticleClaims = {
    slug: string;
    publishedAt: bigint;
    revision: number;
    priorAttestation: `0x${string}`;
};

export type AttestationMessage = {
    schemaVersion: number;
    subject: ArticleSubject;
    claims: ArticleClaims;
};
