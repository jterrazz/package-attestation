import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/** The SHA-256 of the bytes, as bare lowercase hex — the same in every runtime the browser entry reaches. */
export function sha256Hex(bytes: Uint8Array): string {
    return bytesToHex(sha256(bytes));
}
