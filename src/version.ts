// invariant: both are frozen since the first published attestation; a new version is added beside v1, never in its place, and v1's verifier stays.
export const SCHEMA_VERSION = 1 as const;
export const CANONICAL_VERSION = 1 as const;
