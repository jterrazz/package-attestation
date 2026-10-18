import { hasShape } from '../primitives/shape.js';
import type { SignedAttestation, StoredAttestation } from './record.js';

const STORED_ATTESTATION = {
    claims: {
        priorAttestation: 'string',
        publishedAt: 'string',
        revision: 'number',
        slug: 'string',
    },
    schemaVersion: 'number',
    signature: 'string',
    signerAddress: 'string',
    subject: { contentDigest: 'string', locale: 'string', title: 'string' },
} as const;

export function toStored(attestation: SignedAttestation): StoredAttestation {
    return {
        claims: {
            priorAttestation: attestation.claims.priorAttestation,
            publishedAt: attestation.claims.publishedAt.toString(),
            revision: attestation.claims.revision,
            slug: attestation.claims.slug,
        },
        schemaVersion: attestation.schemaVersion,
        signature: attestation.signature,
        signerAddress: attestation.signerAddress,
        subject: attestation.subject,
    };
}

export function fromStored(stored: StoredAttestation): SignedAttestation {
    return {
        claims: {
            priorAttestation: stored.claims.priorAttestation,
            publishedAt: BigInt(stored.claims.publishedAt),
            revision: stored.claims.revision,
            slug: stored.claims.slug,
        },
        schemaVersion: stored.schemaVersion,
        signature: stored.signature,
        signerAddress: stored.signerAddress,
        subject: stored.subject,
    };
}

export function stringify(attestation: SignedAttestation): string {
    return `${JSON.stringify(toStored(attestation), null, 2)}\n`;
}

/** Reads a stored attestation; a document missing a member, or holding one of the wrong type, is refused. Whether it is authentic is verifyAttestation's to say. */
export function parse(json: string): SignedAttestation {
    const value: unknown = JSON.parse(json);
    if (!isStoredAttestation(value)) {
        throw new TypeError('Not a stored attestation: a member is missing or of the wrong type.');
    }
    return fromStored(value);
}

// hazard: the shape is the type's, member for member: a member StoredAttestation gains and STORED_ATTESTATION forgets is never checked.
function isStoredAttestation(value: unknown): value is StoredAttestation {
    return hasShape(value, STORED_ATTESTATION);
}
