import {
    compareAttestations,
    readAttestation,
    sameAttestation,
    writeAttestation,
} from './attestation.js';
import type { Attestation } from './attestation.js';
import { applyOp, readOp, sameOp, writeOp } from './ops.js';
import type { Op } from './ops.js';
import type { ProofReader } from './proof-reader.js';
import type { ProofWriter } from './proof-writer.js';

/** A node of a proof: a message, what attests it, and the operations that lead from it to the next messages. */
export type Timestamp = {
    attestations: Attestation[];
    message: Uint8Array;
    ops: { op: Op; stamp: Timestamp }[];
};

/** An attestation, with the message of the node it attests. */
export type Attested = { attestation: Attestation; message: Uint8Array };

const FORK = 0xff;
const ATTESTATION = 0x00;

export function timestampOf(message: Uint8Array): Timestamp {
    return { attestations: [], message, ops: [] };
}

export function readTimestamp(reader: ProofReader, message: Uint8Array): Timestamp {
    const stamp = timestampOf(message);
    let tag = reader.byte();
    while (tag === FORK) {
        readBranch(reader, stamp, reader.byte());
        tag = reader.byte();
    }
    readBranch(reader, stamp, tag);
    return stamp;
}

function readBranch(reader: ProofReader, stamp: Timestamp, tag: number): void {
    if (tag === ATTESTATION) {
        stamp.attestations.push(readAttestation(reader));
        return;
    }
    const op = readOp(reader, tag);
    stamp.ops.push({ op, stamp: readTimestamp(reader, applyOp(op, stamp.message)) });
}

// invariant: attestations are written sorted and before the operations, which keep the order they were read or added in, so a proof read and written back is the same bytes.
export function writeTimestamp(writer: ProofWriter, stamp: Timestamp): void {
    const branches = [
        ...stamp.attestations.toSorted(compareAttestations).map((attestation) => () => {
            writer.byte(ATTESTATION);
            writeAttestation(writer, attestation);
        }),
        ...stamp.ops.map(({ op, stamp: next }) => () => {
            writeOp(writer, op);
            writeTimestamp(writer, next);
        }),
    ];
    for (const [index, write] of branches.entries()) {
        if (index < branches.length - 1) {
            writer.byte(FORK);
        }
        write();
    }
}

/** The node an operation leads to from this one, added if it is not there yet. */
export function followed(stamp: Timestamp, op: Op): Timestamp {
    const existing = stamp.ops.find((branch) => sameOp(branch.op, op));
    if (existing !== undefined) {
        return existing.stamp;
    }
    const next = timestampOf(applyOp(op, stamp.message));
    stamp.ops.push({ op, stamp: next });
    return next;
}

/** Adds to a node what another node over the same message attests, each attestation and each operation once. */
export function merge(into: Timestamp, other: Timestamp): void {
    for (const attestation of other.attestations) {
        if (!into.attestations.some((known) => sameAttestation(known, attestation))) {
            into.attestations.push(attestation);
        }
    }
    for (const branch of other.ops) {
        merge(followed(into, branch.op), branch.stamp);
    }
}

/** Every attestation of the tree, a node's own before those of the nodes it leads to. */
export function attestationsOf(stamp: Timestamp): Attested[] {
    return [
        ...stamp.attestations.map((attestation) => ({ attestation, message: stamp.message })),
        ...stamp.ops.flatMap(({ stamp: next }) => attestationsOf(next)),
    ];
}

/** The nodes closest to the root that carry an attestation. */
export function attestedNodesOf(stamp: Timestamp): Timestamp[] {
    return stamp.attestations.length > 0
        ? [stamp]
        : stamp.ops.flatMap(({ stamp: next }) => attestedNodesOf(next));
}

/** Whether something other than a calendar's promise attests the tree. */
export function isComplete(stamp: Timestamp): boolean {
    return attestationsOf(stamp).some(({ attestation }) => attestation.kind !== 'pending');
}
