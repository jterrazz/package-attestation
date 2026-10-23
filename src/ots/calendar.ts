import { bytesToHex } from '@noble/hashes/utils.js';

import { send } from './http.js';
import { ProofReader } from './proof-reader.js';
import { readTimestamp } from './timestamp.js';
import type { Timestamp } from './timestamp.js';

/** The public calendars a digest is submitted to. */
export const AGGREGATORS = [
    'https://a.pool.opentimestamps.org',
    'https://b.pool.opentimestamps.org',
    'https://a.pool.eternitywall.com',
    'https://ots.btc.catallaxy.com',
];

// invariant: only these calendars are asked to upgrade a proof, so a proof cannot send its verifier to a server its author chose.
const WHITELIST = [
    /^https:\/\/[^./][^/]*\.calendar\.opentimestamps\.org$/u,
    /^https:\/\/[^./][^/]*\.calendar\.eternitywall\.com$/u,
    /^https:\/\/[^./][^/]*\.calendar\.catallaxy\.com$/u,
];

// value: the format's ceiling on what a calendar may answer.
const MAX_ANSWER = 10_000;

const HEADERS = {
    Accept: 'application/vnd.opentimestamps.v1',
    'User-Agent': '@jterrazz/attestation',
};

export function isWhitelisted(uri: string): boolean {
    return WHITELIST.some((pattern) => pattern.test(uri));
}

/** Submits a digest to a calendar, which answers the timestamp of its promise to anchor it. */
export async function submitDigest(calendar: string, digest: Uint8Array): Promise<Timestamp> {
    const answer = await send(new URL('digest', calendar).toString(), {
        body: digest,
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        maxBytes: MAX_ANSWER,
        method: 'POST',
    });
    return readTimestamp(new ProofReader(answer), digest);
}

/** Asks a calendar for what it now holds on a commitment it promised to anchor. */
export async function timestampFrom(calendar: string, commitment: Uint8Array): Promise<Timestamp> {
    const url = `${new URL('timestamp/', calendar).toString()}${bytesToHex(commitment)}`;
    const answer = await send(url, { headers: HEADERS, maxBytes: MAX_ANSWER, method: 'GET' });
    return readTimestamp(new ProofReader(answer), commitment);
}
