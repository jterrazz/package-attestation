import {
    ATTESTATION_DOMAIN_V1,
    ATTESTATION_PRIMARY_TYPE,
    ATTESTATION_TYPES_V1,
} from '../primitives/eip712-schema.js';
import type { AttestationMessage } from '../primitives/eip712-schema.js';
import { isRecord } from '../primitives/shape.js';

export type WalletSignature = {
    signature: `0x${string}`;
    signerAddress: `0x${string}`;
};

const SIGNATURE = /^0x[\dA-Fa-f]{130}$/u;
const ADDRESS = /^0x[\dA-Fa-f]{40}$/u;

// outside: a wallet's eth_signTypedData_v4 reads the domain's types from the payload, and a uint64 as a decimal string, since JSON has no bigint.
/** The EIP-712 v4 payload a browser wallet signs for the message. */
export function typedDataOf(message: AttestationMessage): Record<string, unknown> {
    return {
        domain: ATTESTATION_DOMAIN_V1,
        message: {
            claims: { ...message.claims, publishedAt: message.claims.publishedAt.toString() },
            schemaVersion: message.schemaVersion,
            subject: message.subject,
        },
        primaryType: ATTESTATION_PRIMARY_TYPE,
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
            ],
            ...ATTESTATION_TYPES_V1,
        },
    };
}

/** The signature a wallet page posted, or null when the value is not one: a 65-byte hex signature and a 20-byte hex address. */
export function walletSignatureOf(value: unknown): null | WalletSignature {
    if (!isRecord(value)) {
        return null;
    }
    const { signature, signerAddress } = value;
    if (!isHex(signature, SIGNATURE) || !isHex(signerAddress, ADDRESS)) {
        return null;
    }
    return { signature, signerAddress };
}

function isHex(value: unknown, pattern: RegExp): value is `0x${string}` {
    return typeof value === 'string' && pattern.test(value);
}
