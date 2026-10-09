import { recoverTypedDataAddress } from 'viem';

import { canonicalize } from '../primitives/canonicalize.js';
import {
    ATTESTATION_DOMAIN_V1,
    ATTESTATION_PRIMARY_TYPE,
    ATTESTATION_TYPES_V1,
} from '../primitives/eip712-schema.js';
import { messageOf } from '../primitives/error-message.js';
import { sha256Hex } from '../primitives/sha256.js';
import { SCHEMA_VERSION } from '../version.js';
import type { SignedAttestation } from './record.js';

export type VerifyInput = {
    content: string;
    attestation: SignedAttestation;
};

export type VerifyOk = {
    ok: true;
    signerAddress: `0x${string}`;
};

export type VerifyError =
    | { kind: 'content-mismatch'; expectedDigest: `0x${string}`; actualDigest: `0x${string}` }
    | { kind: 'invalid-signature'; reason: string }
    | { kind: 'schema-version-unsupported'; version: number }
    | { kind: 'signer-mismatch'; recovered: `0x${string}`; declared: `0x${string}` };

export type VerifyFail = {
    ok: false;
    error: VerifyError;
};

export type VerifyResult = VerifyFail | VerifyOk;

export async function verifyAttestation(input: VerifyInput): Promise<VerifyResult> {
    const { attestation } = input;

    if (attestation.schemaVersion !== SCHEMA_VERSION) {
        return {
            error: { kind: 'schema-version-unsupported', version: attestation.schemaVersion },
            ok: false,
        };
    }

    const expected = attestation.subject.contentDigest;
    const actual = `0x${sha256Hex(canonicalize(input.content))}` as const;
    if (actual !== expected) {
        return {
            error: { actualDigest: actual, expectedDigest: expected, kind: 'content-mismatch' },
            ok: false,
        };
    }

    let recovered: `0x${string}`;
    try {
        recovered = await recoverTypedDataAddress({
            domain: ATTESTATION_DOMAIN_V1,
            message: {
                claims: attestation.claims,
                schemaVersion: attestation.schemaVersion,
                subject: attestation.subject,
            },
            primaryType: ATTESTATION_PRIMARY_TYPE,
            signature: attestation.signature,
            types: ATTESTATION_TYPES_V1,
        });
    } catch (error) {
        return {
            error: { kind: 'invalid-signature', reason: messageOf(error) },
            ok: false,
        };
    }

    if (recovered.toLowerCase() !== attestation.signerAddress.toLowerCase()) {
        return {
            error: { declared: attestation.signerAddress, kind: 'signer-mismatch', recovered },
            ok: false,
        };
    }

    return { ok: true, signerAddress: recovered };
}
