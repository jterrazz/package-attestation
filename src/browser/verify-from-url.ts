import type { SignedAttestation } from '../attestation/record.js';
import { parse } from '../attestation/serialize.js';
import { verifyAttestation } from '../attestation/verify.js';
import { messageOf } from '../primitives/error-message.js';
import { hasShape, isRecord } from '../primitives/shape.js';
import { fetchManifest, fetchOk, manifestUrlOf } from './proof.js';
import type { AuthorshipState, DateState, ProofManifest } from './proof.js';

export type VerifyFromUrlOptions = {
    /** Skips the Bitcoin leg: the date is reported `skipped`, `opt-out`. */
    skipOts?: boolean;
    /** The fetch every request goes through (a proxy, a test double); the global one by default. */
    fetchFn?: typeof fetch;
};

export type VerifyFromUrlReport = {
    authorship: AuthorshipState;
    date: DateState;
};

type OtsVerdict =
    | {
          ok: false;
          reason: 'digest-mismatch' | 'explorer-unreachable' | 'invalid-proof' | 'pending-bitcoin';
          details?: string;
      }
    | { ok: true; bitcoinTime: string };

const REASONS: ReadonlySet<unknown> = new Set([
    'digest-mismatch',
    'explorer-unreachable',
    'invalid-proof',
    'pending-bitcoin',
]);

/**
 * Verifies a published article from its URL: its `proof.json`, then its content and attestation, the signature recovered offline, and the Bitcoin date asked of the verifier the manifest names.
 * @example const report = await verifyFromUrl('https://jterrazz.com/articles/17-architects-of-inversion');
 */
export async function verifyFromUrl(
    articleUrl: string,
    opts: VerifyFromUrlOptions = {},
): Promise<VerifyFromUrlReport> {
    const fetchFn = opts.fetchFn ?? fetch;
    const manifestUrl = manifestUrlOf(articleUrl, originOfThePage());

    let manifest: ProofManifest;
    let content: string;
    let attestation: SignedAttestation;
    try {
        manifest = await fetchManifest(fetchFn, manifestUrl);
        const [text, json] = await Promise.all([
            fetchText(fetchFn, new URL(manifest.content, manifestUrl)),
            fetchText(fetchFn, new URL(manifest.attestation, manifestUrl)),
        ]);
        content = text;
        attestation = parse(json);
    } catch (error) {
        const details = messageOf(error);
        return {
            authorship: { details, error: 'fetch', kind: 'failed' },
            date: { details, error: 'fetch', kind: 'failed' },
        };
    }

    const signature = await verifyAttestation({ attestation, content });
    if (!signature.ok) {
        return {
            authorship: { error: signature.error.kind, kind: 'failed' },
            date: { kind: 'skipped', reason: 'opt-out' },
        };
    }

    const authorship: AuthorshipState = {
        kind: 'verified',
        signedAt: new Date(Number(attestation.claims.publishedAt) * 1000),
        signerAddress: signature.signerAddress,
    };
    return {
        authorship,
        date: await dateOf(manifest, manifestUrl, fetchFn, opts.skipOts === true),
    };
}

async function dateOf(
    manifest: ProofManifest,
    manifestUrl: string,
    fetchFn: typeof fetch,
    skipOts: boolean,
): Promise<DateState> {
    if (skipOts) {
        return { kind: 'skipped', reason: 'opt-out' };
    }
    if (manifest.otsVerifier === undefined || manifest.otsVerifier === '') {
        return { kind: 'skipped', reason: 'no-ots-file' };
    }
    try {
        const verdict = await fetchVerdict(fetchFn, new URL(manifest.otsVerifier, manifestUrl));
        if (verdict.ok) {
            return { bitcoinTime: new Date(verdict.bitcoinTime), kind: 'verified' };
        }
        if (verdict.reason === 'pending-bitcoin') {
            return { kind: 'pending' };
        }
        return { details: verdict.details, error: verdict.reason, kind: 'failed' };
    } catch (error) {
        return { details: messageOf(error), error: 'fetch', kind: 'failed' };
    }
}

async function fetchVerdict(fetchFn: typeof fetch, url: URL): Promise<OtsVerdict> {
    const response = await fetchOk(fetchFn, url.toString());
    const value: unknown = await response.json();
    if (isVerdict(value)) {
        return value;
    }
    throw new TypeError(`GET ${url.toString()}: not an OpenTimestamps verdict`);
}

function isVerdict(value: unknown): value is OtsVerdict {
    if (!isRecord(value)) {
        return false;
    }
    if (value.ok === true) {
        return typeof value.bitcoinTime === 'string';
    }
    return value.ok === false && REASONS.has(value.reason) && hasShape(value.details, 'string?');
}

async function fetchText(fetchFn: typeof fetch, url: URL): Promise<string> {
    const response = await fetchOk(fetchFn, url.toString());
    return await response.text();
}

function originOfThePage(): string | undefined {
    const page: { location?: { origin: string } } = globalThis;
    return page.location?.origin;
}
