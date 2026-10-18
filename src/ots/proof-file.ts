import OpenTimestamps from 'javascript-opentimestamps';
import type { DetachedTimestampFile } from 'javascript-opentimestamps';

// outside: the library refuses bytes that open on no OpenTimestamps header by throwing an Error whose message is the header it expected, as an array of numbers, so the refusal is said here, in words.
/** Reads the bytes of an `.ots` proof, refusing bytes that are none. */
export function proofFileOf(bytes: Uint8Array): DetachedTimestampFile {
    try {
        return OpenTimestamps.DetachedTimestampFile.deserialize(bytes);
    } catch {
        throw new TypeError(
            'Not an OpenTimestamps proof: the bytes do not read as a detached timestamp file.',
        );
    }
}
