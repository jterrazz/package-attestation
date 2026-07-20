# @jterrazz/attestation

Cryptographic attestation for articles — an EIP-712 signature over the canonicalized content, anchored to Bitcoin via OpenTimestamps. Prove an article existed, unmodified, at a point in time, signed by its author.

## Entries

| Import | Runs in | Carries |
| --- | --- | --- |
| `@jterrazz/attestation` | Node | full surface: canonicalize, EIP-712 schema, create/sign/verify, serialize, audit |
| `@jterrazz/attestation/browser` | any runtime | verify-only, pure ESM (noble-hashes + viem): `verifyFromUrl`, ENS helpers |
| `@jterrazz/attestation/node` | Node | OpenTimestamps: `stampDigest`, `upgradeProof`, `verifyOts` |
| `npx attestation` (CLI) | Node | `sign`, `verify`, `upgrade` |

## Flow

1. **Sign** — canonicalize the article body, digest it (SHA-256), build the EIP-712 `AttestationMessage`, sign with the author key → `<article>.attestation.json`.
2. **Stamp** — `stampDigest` submits the digest to OpenTimestamps calendars → `<article>.ots`.
3. **Upgrade** — once anchored in a Bitcoin block, `upgradeProof` completes the proof.
4. **Verify** — anywhere: signature (`verifyAttestation`), timestamp (`verifyOts`), or both from a URL in the browser (`verifyFromUrl`).

## Tests

`npm test` (offline, deterministic). `npm run test:network` opts into the OpenTimestamps-calendar e2e suite.

Reference consumer: [`jterrazz-web`](https://github.com/jterrazz/jterrazz-web) (verify page, proof card, signing scripts).

MIT © [Jean-Baptiste Terrazzoni](https://github.com/jterrazz)
