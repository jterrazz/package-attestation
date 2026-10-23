import { Buffer } from 'node:buffer';

import { digestLengthOf, hashOfTag, tagOfHash } from './ops.js';
import type { HashName } from './ops.js';
import { malformed, ProofReader } from './proof-reader.js';
import { ProofWriter } from './proof-writer.js';
import { readTimestamp, timestampOf, writeTimestamp } from './timestamp.js';
import type { Timestamp } from './timestamp.js';

const MAGIC = Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294', 'hex');
const MAJOR_VERSION = 1;

/** An `.ots` file: the hash of the file it proves, and the timestamp tree that grows from that digest. */
export type ProofFile = { hash: HashName; timestamp: Timestamp };

/** Reads the bytes of an `.ots` proof, refusing bytes that are none. */
export function proofFileOf(bytes: Uint8Array): ProofFile {
    try {
        return read(new ProofReader(bytes));
    } catch {
        throw new TypeError(
            'Not an OpenTimestamps proof: the bytes do not read as a detached timestamp file.',
        );
    }
}

function read(reader: ProofReader): ProofFile {
    if (!MAGIC.equals(reader.bytes(MAGIC.length)) || reader.varuint() !== MAJOR_VERSION) {
        malformed();
    }
    const hash = hashOfTag(reader.byte()) ?? malformed();
    const timestamp = readTimestamp(reader, reader.bytes(digestLengthOf(hash)));
    if (!reader.atEnd()) {
        malformed();
    }
    return { hash, timestamp };
}

/** A proof of a SHA-256 digest that nothing attests yet. */
export function proofFileOfDigest(digest: Uint8Array): ProofFile {
    return { hash: 'sha256', timestamp: timestampOf(digest) };
}

export function bytesOfProofFile({ hash, timestamp }: ProofFile): Uint8Array {
    const writer = new ProofWriter();
    writer.bytes(MAGIC);
    writer.varuint(MAJOR_VERSION);
    writer.byte(tagOfHash(hash));
    writer.bytes(timestamp.message);
    writeTimestamp(writer, timestamp);
    return writer.output();
}
