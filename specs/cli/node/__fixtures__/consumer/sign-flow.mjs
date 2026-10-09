import { buildAttestationMessage } from '@jterrazz/attestation';
import { signViaBrowser } from '@jterrazz/attestation/node';

import { article } from './wallet.mjs';

const message = buildAttestationMessage({ ...article, slug: 'a`b\\c</script>d<!-- ${1+1} ${globalThis.pwned=7}' });
const signature = `0x${'ab'.repeat(65)}`;
const signerAddress = `0x${'Cd'.repeat(20)}`;

async function ask(url, path, init) {
    const response = await fetch(new URL(path, url), init);
    const body = await response.text();
    return `${init?.method ?? 'GET'} ${path} → ${response.status} ${response.headers.get('content-type')} ${body.length > 200 ? '(page)' : JSON.stringify(body)}`;
}
const post = (body) => ({ body, method: 'POST' });

let walking;
const lines = [];
let page = '';
let served = '';
const result = await signViaBrowser({
    message,
    onUrlReady: (url) => {
        walking = (async () => {
        served = url;
        lines.push(`served on ${url.replace(/\d+\/$/u, 'PORT/')}`);
        page = await (await fetch(url)).text();
        lines.push(await ask(url, '/index.html'));
        lines.push(await ask(url, '/', post('{}')));
        lines.push(await ask(url, '/nope'));
        lines.push(await ask(url, '/done'));
        lines.push(await ask(url, '/sig', post('{}')));
        lines.push(await ask(url, '/done', post('{ not json')));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature: 'not-hex', signerAddress }))));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature, signerAddress: '0x1234' }))));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature: `${signature}00`, signerAddress }))));
        lines.push(await ask(url, '/done', post(JSON.stringify(null))));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature: `x${signature}`, signerAddress }))));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature, signerAddress: `x${signerAddress}` }))));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature, signerAddress: `${signerAddress}00` }))));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature: [signature], signerAddress }))));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature, signerAddress: [signerAddress] }))));
        lines.push(await ask(url, '/done', post(JSON.stringify({ signature, signerAddress, extra: true }))));
        })();
        return walking;
    },
    timeoutMs: 5000,
});
// The last answer the page reads may arrive after the flow settles: the walk is awaited before anything is printed.
await walking;
const payload = /<script type="application\/json" id="typed-data">([\s\S]*?)<\/script>/u.exec(page)[1];
process.stdout.write(`${lines.join('\n')}\nresolved: ${JSON.stringify(result)}\n`);
process.stdout.write(`the slug the page reads: ${JSON.parse(payload).message.claims.slug}\n`);
await fetch(served).then(
    (response) => process.stdout.write(`after the flow: still answering ${response.status}\n`),
    () => process.stdout.write('after the flow: the server is closed\n'),
);
process.stdout.write(`${page}\n`);

await signViaBrowser({ message, onUrlReady: () => undefined, timeoutMs: 50 }).catch((error) => process.stdout.write(`unanswered: ${error.message}\n`));
await signViaBrowser({
    message,
    onUrlReady: () => {
        throw new Error('no browser here');
    },
}).catch((error) => process.stdout.write(`the opener failing: ${error.message}\n`));
await signViaBrowser({
    message,
    onUrlReady: async () => {
        throw 'a string';
    },
}).catch((error) => process.stdout.write(`the opener throwing a string: ${error instanceof Error} ${error.message}\n`));
