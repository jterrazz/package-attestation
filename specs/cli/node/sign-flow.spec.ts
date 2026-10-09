import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('sign-flow', () => {
    test('the wallet page is served on the loopback, and only a well-formed signature ends the flow', async () => {
        // Given - a consumer standing in for the browser: it reads the page, then posts what a wallet page could
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/consumer/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .exec('sign-flow.mjs');

        // Then - each request's answer, the signature the flow resolved with, the page, and the flows that never finish
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            served on http://127.0.0.1:PORT/
            GET /index.html → 200 text/html; charset=utf-8 (page)
            POST / → 404 text/plain "Not found"
            GET /nope → 404 text/plain "Not found"
            GET /done → 404 text/plain "Not found"
            POST /sig → 404 text/plain "Not found"
            POST /done → 400 text/plain "Parse error"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 400 text/plain "Invalid payload"
            POST /done → 200 text/plain "OK"
            resolved: {"signature":"0xababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababab","signerAddress":"0xCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCd"}
            after the flow: the server is closed
            <!doctype html>
            <html lang="en">
            <head>
            <meta charset="utf-8" />
            <title>Sign attestation</title>
            <style>
                body { font-family: system-ui, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem; line-height: 1.5; }
                button { padding: 0.75rem 1.5rem; font-size: 1rem; cursor: pointer; }
                pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; font-size: 0.85rem; }
                .ok { color: #0a7d22; }
                .err { color: #b00020; white-space: pre-wrap; }
            </style>
            </head>
            <body>
            <h1>Sign attestation</h1>
            <p>Review the structured data below, then click <strong>Sign</strong>. Your wallet will show the same fields.</p>
            <pre id="preview"></pre>
            <p><button id="sign">Sign with wallet</button></p>
            <p id="status"></p>
            <script>
                const TYPED_DATA = JSON.parse(\`{"domain":{"chainId":1,"name":"jterrazz.com Article Attestation","version":"1"},"message":{"claims":{"priorAttestation":"0x0000000000000000000000000000000000000000000000000000000000000000","publishedAt":"1778284800","revision":1,"slug":"a\\\`b\\\\\\\\c<\\/script>d"},"schemaVersion":1,"subject":{"contentDigest":"0xd2d62011d0490067d3250f2b34e65c9397cabe2bd6dc5081129e3e7408c9e8c2","locale":"en","title":"Hello World"}},"primaryType":"Attestation","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"}],"Attestation":[{"name":"schemaVersion","type":"uint16"},{"name":"subject","type":"ArticleSubject"},{"name":"claims","type":"ArticleClaims"}],"ArticleClaims":[{"name":"slug","type":"string"},{"name":"publishedAt","type":"uint64"},{"name":"revision","type":"uint16"},{"name":"priorAttestation","type":"bytes32"}],"ArticleSubject":[{"name":"title","type":"string"},{"name":"contentDigest","type":"bytes32"},{"name":"locale","type":"string"}]}}\`);
                document.getElementById('preview').textContent = JSON.stringify(TYPED_DATA.message, null, 2);

                document.getElementById('sign').addEventListener('click', async () => {
                    const status = document.getElementById('status');
                    status.className = '';
                    status.textContent = 'Requesting account…';

                    if (!window.ethereum) {
                        status.className = 'err';
                        status.textContent = 'No window.ethereum provider found. Install MetaMask (or another wallet) and reload.';
                        return;
                    }

                    try {
                        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                        const signer = accounts[0];

                        status.textContent = 'Awaiting wallet confirmation…';
                        const signature = await window.ethereum.request({
                            method: 'eth_signTypedData_v4',
                            params: [signer, JSON.stringify(TYPED_DATA)],
                        });

                        status.textContent = 'Submitting signature…';
                        const res = await fetch('/done', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ signature, signerAddress: signer }),
                        });
                        if (!res.ok) throw new Error('Server rejected the signature: HTTP ' + res.status);

                        status.className = 'ok';
                        status.textContent = 'Signed. You can close this tab.';
                        document.getElementById('sign').disabled = true;
                    } catch (err) {
                        status.className = 'err';
                        status.textContent = 'Failed: ' + (err && err.message ? err.message : String(err));
                    }
                });
            </script>
            </body>
            </html>
            unanswered: Sign flow timed out after 50ms
            the opener failing: no browser here
            the opener throwing a string: true a string
        `);
    });
});
