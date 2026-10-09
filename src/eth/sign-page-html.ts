import { jsonScript } from './json-script.js';

const BEFORE_THE_DATA = `<!doctype html>
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
`;

const AFTER_THE_DATA = `
<script>
    const TYPED_DATA = JSON.parse(document.getElementById('typed-data').textContent);
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
</html>`;

/** The page the CLI's loopback server shows: the typed data, and a button that asks the browser's wallet (`window.ethereum`) for an EIP-712 v4 signature, posted back to `/done`. No script is loaded, so what reaches the wallet reads in the page source. */
export function buildSignPageHtml(typedDataJson: string): string {
    return `${BEFORE_THE_DATA}${jsonScript('typed-data', typedDataJson)}${AFTER_THE_DATA}`;
}
