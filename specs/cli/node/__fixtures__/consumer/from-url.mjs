import { createAttestation } from '@jterrazz/attestation';
import { resolveEnsName, stringify, verifyFromUrl } from '@jterrazz/attestation/browser';

import { article, print, wallet } from './wallet.mjs';

const ORIGIN = 'https://example.com';
const signed = stringify(await createAttestation(article, wallet));
const manifest = { attestation: 'en.attestation.json', content: 'en.md', ots: 'en.ots', schemaVersion: 1, slug: 'hello-world' };

function site(pages) {
    const asked = [];
    const fetchFn = async (url) => {
        asked.push(String(url).replace(ORIGIN, ''));
        const page = pages[String(url).replace(ORIGIN, '')];
        if (page === undefined) {
            return new Response('not found', { status: 404 });
        }
        if (page instanceof Error) {
            throw page;
        }
        return new Response(typeof page === 'string' ? page : JSON.stringify(page));
    };
    return { asked, fetchFn };
}

async function report(label, pages, url = `${ORIGIN}/articles/hello`, options = {}) {
    const { asked, fetchFn } = site(pages);
    print(label, await verifyFromUrl(url, { fetchFn, ...options }));
    process.stdout.write(`  asked: ${asked.join(' ')}\n`);
}

const article$ = (extra = {}, overrides = {}) => ({
    '/articles/hello/en.attestation.json': signed,
    '/articles/hello/en.md': article.content,
    '/articles/hello/proof.json': { ...manifest, ...extra },
    ...overrides,
});

await report('no verifier named', article$());
await report('a trailing slash and a query', article$(), `${ORIGIN}/articles/hello/?ref=feed`);
await report('the Bitcoin leg skipped', article$({ otsVerifier: '/verify-ots.json' }), undefined, { skipOts: true });
await report('an empty verifier', article$({ otsVerifier: '' }));
await report('verified on Bitcoin', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { bitcoinTime: '2026-05-09T14:51:40.000Z', ok: true } }));
await report('pending its block', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { ok: false, reason: 'pending-bitcoin' } }));
await report('a proof refused', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { details: 'merkle root differs', ok: false, reason: 'invalid-proof' } }));
await report('a verifier down', article$({ otsVerifier: '/verify-ots.json' }));
await report('a verifier answering no verdict', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { ok: 'yes' } }));
await report('a digest the verifier refuses', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { ok: false, reason: 'digest-mismatch' } }));
await report('a verifier neither passing nor refusing', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { ok: 'no', reason: 'invalid-proof' } }));
await report('a refusal whose details are no text', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { details: 7, ok: false, reason: 'invalid-proof' } }));
await report('a verifier named by a number', article$({ otsVerifier: 7 }));
await report('a verifier with an unknown reason', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { ok: false, reason: 'unplugged' } }));
await report('a verifier passing with no time', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { ok: true } }));
await report('a verifier refusing with no reason', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': { ok: false } }));
await report('a verifier answering null', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': null }));
await report('a verifier unreachable', article$({ otsVerifier: '/verify-ots.json' }, { '/verify-ots.json': new TypeError('fetch failed') }));
await report('tampered markdown', article$({}, { '/articles/hello/en.md': '# Hello\n\nMutated.' }));
await report('no manifest', {});
await report('a manifest that is none', { '/articles/hello/proof.json': { content: 'en.md' } });
await report('no content', article$({}, { '/articles/hello/en.md': undefined }));
await report('no attestation', article$({}, { '/articles/hello/en.attestation.json': undefined }));
await report('an attestation that is none', article$({}, { '/articles/hello/en.attestation.json': '{}' }));
await report('a thrown string', { '/articles/hello/proof.json': 'x' }, `${ORIGIN}/articles/hello`, {
    fetchFn: async () => {
        throw 'offline';
    },
});

const global = site(article$());
const realFetch = globalThis.fetch;
globalThis.fetch = global.fetchFn;
print('through the global fetch', await verifyFromUrl(`${ORIGIN}/articles/hello`));
globalThis.fetch = realFetch;
process.stdout.write(`  asked: ${global.asked.join(' ')}\n`);

globalThis.location = { origin: ORIGIN };
await report('a path read from the page', article$(), '/articles/hello');
delete globalThis.location;

globalThis.fetch = async (url, init) => {
    process.stdout.write(`ens asked ${String(url)} ${init?.method ?? 'GET'}\n`);
    throw new TypeError('offline');
};
print('an ENS name, offline', await resolveEnsName(wallet.address));
globalThis.fetch = realFetch;
