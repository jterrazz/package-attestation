# @jterrazz/attestation

Cryptographic attestation for articles: an EIP-712 signature over the canonicalized content, anchored to Bitcoin via OpenTimestamps. Prove an article existed, unmodified, at a point in time, signed by its author.

## Entries

| Import                            | Runs in     | Carries                                                                                        |
| --------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `@jterrazz/attestation`           | Node        | full surface: canonicalize, EIP-712 schema, create/sign/verify, serialize, audit               |
| `@jterrazz/attestation/browser`   | any runtime | verify-only, pure ESM (noble-hashes + viem): `verifyFromUrl`, ENS helpers                      |
| `@jterrazz/attestation/node`      | Node        | OpenTimestamps: `stampDigest`, `upgradeProof`, `verifyOts`; the wallet sign flows              |
| `npx @jterrazz/attestation` (CLI) | Node        | `sign`, `verify`, `upgrade`; `attestation` once installed ([reference](docs/reference/cli.md)) |

## In 30 seconds

```bash
npm install @jterrazz/attestation viem
```

```ts
import { createAttestation, parse, stringify, verifyAttestation } from '@jterrazz/attestation';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const author = privateKeyToAccount(generatePrivateKey());
const content = '# Hello\n\nWorld.';

const signed = await createAttestation(
    { content, locale: 'en', publishedAt: new Date(), slug: 'hello', title: 'Hello' },
    author,
);
const json = stringify(signed); // what <article>.attestation.json holds

const verdict = await verifyAttestation({ attestation: parse(json), content });
console.log(verdict); // { ok: true, signerAddress: '0x...' }
```

A published article, from any runtime, a browser tab included:

```ts
import { verifyFromUrl } from '@jterrazz/attestation/browser';

const report = await verifyFromUrl('https://www.jterrazz.com/articles/17-architects-of-inversion');
console.log(report.authorship.kind, report.date.kind); // verified verified
```

The same from a terminal, with no install: `npx @jterrazz/attestation verify https://www.jterrazz.com/articles/17-architects-of-inversion`. Signing a file with your own wallet, anchoring it in Bitcoin and verifying it is [the first attestation](docs/start/first-attestation.md), step by step.

## Flow

1. **Sign**: canonicalize the article body, digest it (SHA-256), build the EIP-712 `AttestationMessage` and sign it with the author key, which writes `<article>.attestation.json`.
2. **Stamp**: `stampDigest` submits the digest to the OpenTimestamps calendars, which answer `<article>.ots`.
3. **Upgrade**: once anchored in a Bitcoin block, `upgradeProof` completes the proof.
4. **Verify**, anywhere: the signature (`verifyAttestation`), the timestamp (`verifyOts`), or both from a URL in the browser (`verifyFromUrl`).

## Tests

`make test` (offline, deterministic: the package is specified from its tarball). `make test-network` opts into the live OpenTimestamps calendars.

Reference consumer: [`jterrazz-web`](https://github.com/jterrazz/jterrazz-web) (verify page, proof card, signing scripts).

## Documentation

The manual is [`docs/`](docs/README.md): the architecture and what an attestation proves, how the package is developed, tested and released, and the CLI's reference. For agents: the [`skills/jterrazz-attestation`](skills/jterrazz-attestation/SKILL.md) skill.

MIT © [Jean-Baptiste Terrazzoni](https://github.com/jterrazz)
