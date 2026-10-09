export { CANONICAL_VERSION, SCHEMA_VERSION } from './version.js';

export { audit, type AuditFinding } from './primitives/audit.js';
export { canonicalize, InvalidContentError } from './primitives/canonicalize.js';
export {
    type ArticleClaims,
    type ArticleSubject,
    ATTESTATION_DOMAIN_V1,
    ATTESTATION_PRIMARY_TYPE,
    ATTESTATION_TYPES_V1,
    type AttestationMessage,
    NO_PRIOR_ATTESTATION,
} from './primitives/eip712-schema.js';

export {
    buildAttestationMessage,
    createAttestation,
    type CreateAttestationInput,
    signAttestation,
} from './attestation/create.js';
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
