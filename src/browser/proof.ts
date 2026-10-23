import type { VerifyError } from '../attestation/verify.js';
import { hasShape } from '../primitives/shape.js';

/** The `proof.json` a published article serves beside itself, its paths relative to it. */
export type ProofManifest = {
    schemaVersion: number;
    slug: string;
    content: string;
    attestation: string;
    ots: string;
    /** A server-side OpenTimestamps verifier, answering `{ ok: true, bitcoinTime }` or `{ ok: false, reason, details? }`: a browser cannot check a proof itself. */
    otsVerifier?: string;
};

export type AuthorshipState =
    | { kind: 'failed'; error: 'fetch' | VerifyError['kind']; details?: string }
    | { kind: 'fetching' }
    | { kind: 'idle' }
    | {
          kind: 'verified';
          signerAddress: `0x${string}`;
          signerEns?: string;
          signedAt: Date;
      }
    | { kind: 'verifying' };

export type DateState =
    | {
          kind: 'failed';
          error: 'digest-mismatch' | 'explorer-unreachable' | 'fetch' | 'invalid-proof';
          details?: string | undefined;
      }
    | { kind: 'fetching' }
    | { kind: 'idle' }
    | { kind: 'pending' }
    | { kind: 'skipped'; reason: 'browser-runtime' | 'no-ots-file' | 'opt-out' }
    | { kind: 'verified'; bitcoinTime: Date }
    | { kind: 'verifying' };

const PROOF_MANIFEST = {
    attestation: 'string',
    content: 'string',
    ots: 'string',
    otsVerifier: 'string?',
    schemaVersion: 'number',
    slug: 'string',
} as const;

/** The manifest of an article URL: `proof.json` inside it, a relative URL read from `origin`. */
export function manifestUrlOf(articleUrl: string, origin?: string): string {
    const url = new URL(articleUrl, origin);
    url.pathname = `${url.pathname.replace(/\/$/u, '')}/proof.json`;
    return url.toString();
}

export async function fetchManifest(fetchFn: typeof fetch, url: string): Promise<ProofManifest> {
    const response = await fetchOk(fetchFn, url);
    const value: unknown = await response.json();
    if (!isProofManifest(value)) {
        throw new TypeError(`GET ${url}: not a proof manifest`);
    }
    return value;
}

/** The response of a GET that answered 2xx; any other status is thrown as `GET <url>: HTTP <status>`. */
export async function fetchOk(fetchFn: typeof fetch, url: string): Promise<Response> {
    const response = await fetchFn(url);
    if (!response.ok) {
        throw new Error(`GET ${url}: HTTP ${response.status}`);
    }
    return response;
}

// hazard: the shape is the type's, member for member: a member ProofManifest gains and PROOF_MANIFEST forgets is never checked.
function isProofManifest(value: unknown): value is ProofManifest {
    return hasShape(value, PROOF_MANIFEST);
}
