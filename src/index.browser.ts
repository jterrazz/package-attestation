// invariant: this entry runs in any modern JavaScript runtime, a browser tab included — nothing it reaches imports a Node module (fs, http, crypto) or OpenTimestamps; hashing and signatures go through @noble/hashes and viem.
export { canonicalize, InvalidContentError } from './primitives/canonicalize.js';
export { sha256Hex } from './primitives/sha256.js';
export {
    type ArticleClaims,
    type ArticleSubject,
    ATTESTATION_DOMAIN_V1,
    ATTESTATION_PRIMARY_TYPE,
    ATTESTATION_TYPES_V1,
    type AttestationMessage,
    NO_PRIOR_ATTESTATION,
} from './primitives/eip712-schema.js';

export { buildAttestationMessage, type CreateAttestationInput } from './attestation/create.js';
export { attestationDigest } from './attestation/digest.js';
export { type SignedAttestation, type StoredAttestation } from './attestation/record.js';
export { fromStored, parse, stringify, toStored } from './attestation/serialize.js';
export {
    verifyAttestation,
    type VerifyError,
    type VerifyFail,
    type VerifyInput,
    type VerifyOk,
    type VerifyResult,
} from './attestation/verify.js';

export { resolveEnsName } from './browser/ens.js';
export { type AuthorshipState, type DateState, type ProofManifest } from './browser/proof.js';
export {
    verifyFromUrl,
    type VerifyFromUrlOptions,
    type VerifyFromUrlReport,
} from './browser/verify-from-url.js';
