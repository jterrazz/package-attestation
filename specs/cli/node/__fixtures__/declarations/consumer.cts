import { attestationDigest, canonicalize, NO_PRIOR_ATTESTATION, type AttestationMessage } from '@jterrazz/attestation';
import { sha256Hex } from '@jterrazz/attestation/browser';
import { stampDigest, upgradeProof } from '@jterrazz/attestation/node';

export function digestOf(message: AttestationMessage): `0x${string}` {
    return message.claims.priorAttestation === NO_PRIOR_ATTESTATION ? attestationDigest(message) : message.claims.priorAttestation;
}

export const canonical: Uint8Array = canonicalize('# Hello\r\n');
export const hex: string = sha256Hex(canonical);

export async function anchor(digest: Uint8Array): Promise<boolean> {
    const proof: Uint8Array = await stampDigest(digest);
    const { upgraded }: { upgraded: boolean } = await upgradeProof(proof);
    return upgraded;
}

// @ts-expect-error the digest is hex, never bytes
export const wrong: Uint8Array = attestationDigest({} as AttestationMessage);
