import { ripemd160, sha1 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { Buffer } from 'node:buffer';

import { malformed } from './proof-reader.js';
import type { ProofReader } from './proof-reader.js';
import { ProofWriter } from './proof-writer.js';

const HASHES = {
    keccak256: { digest: keccak_256, tag: 0x67 },
    ripemd160: { digest: ripemd160, tag: 0x03 },
    sha1: { digest: sha1, tag: 0x02 },
    sha256: { digest: sha256, tag: 0x08 },
} as const;

const APPEND = 0xf0;
const PREPEND = 0xf1;

// value: the format's ceiling on an operation's argument and result, the same in every client.
const MAX_LENGTH = 4096;

export type HashName = keyof typeof HASHES;

/** One step of a timestamp: the operation that turns a node's message into its child's. */
export type Op = { arg: Uint8Array; name: 'append' | 'prepend' } | { name: HashName };

const HASH_NAMES: readonly HashName[] = ['keccak256', 'ripemd160', 'sha1', 'sha256'];

export function hashOfTag(tag: number): HashName | undefined {
    return HASH_NAMES.find((name) => HASHES[name].tag === tag);
}

export function digestLengthOf(hash: HashName): number {
    return HASHES[hash].digest.outputLen;
}

export function tagOfHash(hash: HashName): number {
    return HASHES[hash].tag;
}

export function readOp(reader: ProofReader, tag: number): Op {
    const hash = hashOfTag(tag);
    if (hash !== undefined) {
        return { name: hash };
    }
    if (tag === APPEND || tag === PREPEND) {
        return { arg: reader.varbytes(MAX_LENGTH, 1), name: tag === APPEND ? 'append' : 'prepend' };
    }
    return malformed();
}

export function writeOp(writer: ProofWriter, op: Op): void {
    if ('arg' in op) {
        writer.byte(op.name === 'append' ? APPEND : PREPEND);
        writer.varbytes(op.arg);
        return;
    }
    writer.byte(tagOfHash(op.name));
}

export function sameOp(left: Op, right: Op): boolean {
    return Buffer.from(bytesOfOp(left)).equals(bytesOfOp(right));
}

function bytesOfOp(op: Op): Uint8Array {
    const writer = new ProofWriter();
    writeOp(writer, op);
    return writer.output();
}

export function applyOp(op: Op, message: Uint8Array): Uint8Array {
    const result = resultOf(op, message);
    if (result.length > MAX_LENGTH) {
        malformed();
    }
    return result;
}

function resultOf(op: Op, message: Uint8Array): Uint8Array {
    if ('arg' in op) {
        return op.name === 'append'
            ? Buffer.concat([message, op.arg])
            : Buffer.concat([op.arg, message]);
    }
    return HASHES[op.name].digest(message);
}
