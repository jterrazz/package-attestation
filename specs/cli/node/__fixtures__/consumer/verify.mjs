import { createAttestation, verifyAttestation } from '@jterrazz/attestation';
import { verifyAttestation as verifyInBrowser } from '@jterrazz/attestation/browser';

import { article, print, wallet } from './wallet.mjs';

const signed = await createAttestation(article, wallet);
const verdict = async (attestation, content = article.content) => await verifyAttestation({ attestation, content });

print('as signed', await verdict(signed));
print('as signed, from the browser entry', await verifyInBrowser({ attestation: signed, content: article.content }));
print('CRLF content', await verdict(signed, '# Hello\r\n\r\nWorld.\r\n'));
print('a byte lost', await verdict(signed, '# Hello\n\nWorl.'));
print('a declared signer in upper case', await verdict({ ...signed, signerAddress: `0x${signed.signerAddress.slice(2).toUpperCase()}` }));
print('another declared signer', await verdict({ ...signed, signerAddress: '0x0000000000000000000000000000000000000001' }));
print('a zeroed signature', await verdict({ ...signed, signature: `0x${'00'.repeat(65)}` }));
print('a truncated signature', await verdict({ ...signed, signature: '0x1234' }));
print('a slug swapped', await verdict({ ...signed, claims: { ...signed.claims, slug: 'different-slug' } }));
print('a title rewritten', await verdict({ ...signed, subject: { ...signed.subject, title: 'Different Title' } }));
print('a date moved a second', await verdict({ ...signed, claims: { ...signed.claims, publishedAt: signed.claims.publishedAt + 1n } }));
print('a schema from the future', await verdict({ ...signed, schemaVersion: 999 }));
