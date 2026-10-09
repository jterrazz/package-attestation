import {
    buildAttestationMessage,
    CANONICAL_VERSION,
    createAttestation,
    NO_PRIOR_ATTESTATION,
    SCHEMA_VERSION,
    signAttestation,
} from '@jterrazz/attestation';

import { article, print, wallet } from './wallet.mjs';

print('versions', { CANONICAL_VERSION, NO_PRIOR_ATTESTATION, SCHEMA_VERSION });
print('a Date', buildAttestationMessage(article));
print('unix seconds, a fraction dropped', buildAttestationMessage({ ...article, publishedAt: 1_778_284_800.9 }).claims);
print('a bigint', buildAttestationMessage({ ...article, publishedAt: 1_778_284_800n }).claims);
print('a millisecond past the second', buildAttestationMessage({ ...article, publishedAt: new Date('2026-05-09T00:00:00.999Z') }).claims);

const prior = `0x${'aa'.repeat(32)}`;
print('a second revision', buildAttestationMessage({ ...article, priorAttestation: prior, revision: 2 }).claims);

const lf = buildAttestationMessage({ ...article, content: 'line\nline' }).subject.contentDigest;
const crlf = buildAttestationMessage({ ...article, content: 'line\r\nline\r\n' }).subject.contentDigest;
print('LF and CRLF content', { crlf, lf });

const signed = await createAttestation(article, wallet);
print('signed', { signature: signed.signature, signerAddress: signed.signerAddress });
print('signed in two steps', await signAttestation(buildAttestationMessage(article), wallet));
