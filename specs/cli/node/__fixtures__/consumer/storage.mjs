import { createAttestation, fromStored, parse, stringify, toStored } from '@jterrazz/attestation';

import { article, print, wallet } from './wallet.mjs';

const signed = await createAttestation(article, wallet);
const json = stringify(signed);

process.stdout.write(json);
print('stored', toStored(signed));
print('restored', fromStored(toStored(signed)));
print('parsed', parse(json));

const stored = JSON.parse(json);
const without = (path) => {
    const copy = structuredClone(stored);
    const [head, tail] = path.split('.');
    if (tail === undefined) {
        delete copy[head];
    } else {
        delete copy[head][tail];
    }
    return copy;
};
const refused = [
    ['null', null],
    ['a number', 7],
    ['schemaVersion as text', { ...stored, schemaVersion: '1' }],
    ...['schemaVersion', 'signature', 'signerAddress', 'subject', 'claims', 'subject.title', 'subject.contentDigest', 'subject.locale', 'claims.slug', 'claims.publishedAt', 'claims.revision', 'claims.priorAttestation'].map((path) => [`no ${path}`, without(path)]),
];
for (const [label, document] of refused) {
    try {
        parse(JSON.stringify(document));
        process.stdout.write(`${label}: read\n`);
    } catch (error) {
        process.stdout.write(`${label}: ${error.name}: ${error.message}\n`);
    }
}
print('an extra member, left out', Object.keys(parse(JSON.stringify({ ...stored, bitcoinTimestamp: '2026-05-09T14:51:40.000Z' }))));
