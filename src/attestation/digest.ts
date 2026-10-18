import { hashTypedData } from 'viem';

import {
    ATTESTATION_DOMAIN_V1,
    ATTESTATION_PRIMARY_TYPE,
    ATTESTATION_TYPES_V1,
} from '../primitives/eip712-schema.js';
import type { AttestationMessage } from '../primitives/eip712-schema.js';

/** The reference a later revision gives as its `claims.priorAttestation`: the EIP-712 digest of the attestation's message. It is the very hash its author signed, so it is the same whichever way the record was serialized. */
export function attestationDigest(attestation: AttestationMessage): `0x${string}` {
    return hashTypedData({
        domain: ATTESTATION_DOMAIN_V1,
        message: {
            claims: attestation.claims,
            schemaVersion: attestation.schemaVersion,
            subject: attestation.subject,
        },
        primaryType: ATTESTATION_PRIMARY_TYPE,
        types: ATTESTATION_TYPES_V1,
    });
}
