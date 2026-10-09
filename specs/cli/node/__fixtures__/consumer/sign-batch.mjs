import { buildAttestationMessage } from '@jterrazz/attestation';
import { signBatchViaBrowser } from '@jterrazz/attestation/node';

import { article } from './wallet.mjs';

const entries = [
    { id: 'first', label: 'First article', message: buildAttestationMessage(article) },
    { id: 'second', label: 'Second </script> article', message: buildAttestationMessage({ ...article, slug: 'second' }) },
];
const signature = `0x${'ab'.repeat(65)}`;
const signerAddress = `0x${'cd'.repeat(20)}`;

async function ask(url, path, init) {
    const response = await fetch(new URL(path, url), init);
    const body = await response.text();
    return `${init?.method ?? 'GET'} ${path} → ${response.status} ${response.headers.get('content-type')} ${body.length > 200 ? '(page)' : JSON.stringify(body)}`;
}
const post = (body) => ({ body, method: 'POST' });

let walking;
const lines = [];
let page = '';
const result = await signBatchViaBrowser({
    entries,
    onUrlReady: (url) => {
        walking = (async () => {
        page = await (await fetch(url)).text();
        lines.push(await ask(url, '/'));
        lines.push(await ask(url, '/index.html'));
        lines.push(await ask(url, '/nope'));
        lines.push(await ask(url, '/nope', post('{}')));
        lines.push(await ask(url, '/', post('{}')));
        lines.push(await ask(url, '/done'));
        lines.push(await ask(url, '/sig', post('{ not json')));
        lines.push(await ask(url, '/skip', post('{ not json')));
        lines.push(await ask(url, '/sig', post(JSON.stringify({ signature, signerAddress }))));
        lines.push(await ask(url, '/sig', post(JSON.stringify({ id: 7, signature, signerAddress }))));
        lines.push(await ask(url, '/sig', post(JSON.stringify(null))));
        lines.push(await ask(url, '/sig', post(JSON.stringify({ id: 'first', signature: '0x12', signerAddress }))));
        lines.push(await ask(url, '/sig', post(JSON.stringify({ id: 'first', signature, signerAddress }))));
        lines.push(await ask(url, '/skip', post(JSON.stringify({ id: 'second', reason: 'User rejected the request.' }))));
        lines.push(await ask(url, '/skip', post(JSON.stringify({ id: 'third' }))));
        lines.push(await ask(url, '/skip', post(JSON.stringify({ id: 'fourth', reason: 4 }))));
        lines.push(await ask(url, '/done', post('')));
        })();
        return walking;
    },
    timeoutMs: 5000,
});
// The last answer the page reads may arrive after the flow settles: the walk is awaited before anything is printed.
await walking;
process.stdout.write(`${lines.join('\n')}\n`);
process.stdout.write(`signatures: ${JSON.stringify([...result.signatures])}\nskipped: ${JSON.stringify([...result.skipped])}\n`);
process.stdout.write(`${page}\n`);

await signBatchViaBrowser({ entries, onUrlReady: () => undefined, timeoutMs: 50 }).catch((error) => process.stdout.write(`unanswered: ${error.message}\n`));
