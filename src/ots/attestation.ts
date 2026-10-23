import { Buffer } from 'node:buffer';

import { malformed, ProofReader } from './proof-reader.js';
import { ProofWriter } from './proof-writer.js';

const PENDING = Uint8Array.of(0x83, 0xdf, 0xe3, 0x0d, 0x2e, 0xf9, 0x0c, 0x8e);
const BITCOIN = Uint8Array.of(0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01);

// value: the format's ceilings on an attestation's payload and on a calendar's URI.
const MAX_PAYLOAD = 8192;
const MAX_URI = 1000;

const URI_CHARACTERS = /^[\d./:A-Za-z-]*$/u;

/** What a node of a timestamp is attested by: a calendar that will anchor it, a Bitcoin block, or a notary this client does not read, kept as its bytes. */
export type Attestation =
    | { height: number; kind: 'bitcoin' }
    | { kind: 'pending'; uri: string }
    | { kind: 'unknown'; payload: Uint8Array; tag: Uint8Array };

export function readAttestation(reader: ProofReader): Attestation {
    const tag = reader.bytes(8);
    const payload = reader.varbytes(MAX_PAYLOAD);
    if (Buffer.from(tag).equals(PENDING)) {
        return { kind: 'pending', uri: uriOf(whole(payload, (field) => field.varbytes(MAX_URI))) };
    }
    if (Buffer.from(tag).equals(BITCOIN)) {
        return { height: whole(payload, (field) => field.varuint()), kind: 'bitcoin' };
    }
    return { kind: 'unknown', payload, tag };
}

export function writeAttestation(writer: ProofWriter, attestation: Attestation): void {
    writer.bytes(tagOf(attestation));
    writer.varbytes(payloadOf(attestation));
}

/** The order the format writes a node's attestations in: by tag, then by what each attests. */
export function compareAttestations(left: Attestation, right: Attestation): number {
    const byTag = Buffer.compare(tagOf(left), tagOf(right));
    if (byTag !== 0) {
        return byTag;
    }
    if (left.kind === 'bitcoin' && right.kind === 'bitcoin') {
        return left.height - right.height;
    }
    if (left.kind === 'pending' && right.kind === 'pending') {
        return Buffer.compare(Buffer.from(left.uri), Buffer.from(right.uri));
    }
    return Buffer.compare(payloadOf(left), payloadOf(right));
}

export function sameAttestation(left: Attestation, right: Attestation): boolean {
    return compareAttestations(left, right) === 0;
}

function tagOf(attestation: Attestation): Uint8Array {
    switch (attestation.kind) {
        case 'bitcoin': {
            return BITCOIN;
        }
        case 'pending': {
            return PENDING;
        }
        default: {
            return attestation.tag;
        }
    }
}

function payloadOf(attestation: Attestation): Uint8Array {
    const payload = new ProofWriter();
    switch (attestation.kind) {
        case 'bitcoin': {
            payload.varuint(attestation.height);
            break;
        }
        case 'pending': {
            payload.varbytes(new TextEncoder().encode(attestation.uri));
            break;
        }
        default: {
            return attestation.payload;
        }
    }
    return payload.output();
}

function whole<T>(payload: Uint8Array, read: (field: ProofReader) => T): T {
    const field = new ProofReader(payload);
    const value = read(field);
    if (!field.atEnd()) {
        malformed();
    }
    return value;
}

function uriOf(bytes: Uint8Array): string {
    const uri = new TextDecoder().decode(bytes);
    if (!URI_CHARACTERS.test(uri)) {
        malformed();
    }
    return uri;
}
