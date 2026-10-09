import {
    attestationDigest,
    buildAttestationMessage,
    parse,
    stringify,
    verifyAttestation,
    type SignedAttestation,
    type StoredAttestation,
    type VerifyResult,
} from '@jterrazz/attestation';
import { verifyFromUrl, type VerifyFromUrlReport } from '@jterrazz/attestation/browser';
import { signViaBrowser, verifyOts, type OtsVerifyResult, type SignFlowResult } from '@jterrazz/attestation/node';

const message = buildAttestationMessage({ content: '# Hello', locale: 'en', publishedAt: new Date(), slug: 'hello', title: 'Hello' });
const prior: `0x${string}` = attestationDigest(message);
const revision: number = buildAttestationMessage({ content: '# Hello', locale: 'en', priorAttestation: prior, publishedAt: 0n, revision: 2, slug: 'hello', title: 'Hello' }).claims.revision;

export async function check(json: string): Promise<boolean> {
    const attestation: SignedAttestation = parse(json);
    const verdict: VerifyResult = await verifyAttestation({ attestation, content: '# Hello' });
    const text: string = stringify(attestation);
    const report: VerifyFromUrlReport = await verifyFromUrl('https://example.com/articles/hello', { skipOts: true });
    const date: OtsVerifyResult = await verifyOts(new Uint8Array(32), new Uint8Array(), { explorerUrl: 'https://blockstream.info/api' });
    const signed: SignFlowResult = await signViaBrowser({ message, onUrlReady: () => undefined, timeoutMs: 1000 });
    return verdict.ok && text.length > revision && report.authorship.kind === 'verified' && date.ok && signed.signature.startsWith('0x');
}

// @ts-expect-error a stored attestation carries its signature
export const unsigned: StoredAttestation = { claims: { priorAttestation: prior, publishedAt: '0', revision: 1, slug: 'hello' }, schemaVersion: 1, signerAddress: '0x0', subject: { contentDigest: prior, locale: 'en', title: 'Hello' } };

// @ts-expect-error a date is a Date, a number of seconds or a bigint, never a string
buildAttestationMessage({ content: '', locale: 'en', publishedAt: '2026-05-09', slug: 's', title: 't' });

// @ts-expect-error a verdict on the date is asked with a Bitcoin explorer, not a calendar list
await verifyOts(new Uint8Array(32), new Uint8Array(), { calendars: [] });
