# @jterrazz/attestation

Cryptographic attestation for articles — an EIP-712 signature over the canonicalized content, anchored to Bitcoin via OpenTimestamps. Prove an article existed, unmodified, at a point in time, signed by its author.

## Entries

| Import                          | Runs in     | Carries                                                                          |
| ------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| `@jterrazz/attestation`         | Node        | full surface: canonicalize, EIP-712 schema, create/sign/verify, serialize, audit |
| `@jterrazz/attestation/browser` | any runtime | verify-only, pure ESM (noble-hashes + viem): `verifyFromUrl`, ENS helpers        |
| `@jterrazz/attestation/node`    | Node        | OpenTimestamps: `stampDigest`, `upgradeProof`, `verifyOts`                       |
| `npx attestation` (CLI)         | Node        | `sign`, `verify`, `upgrade`                                                      |

## Flow

1. **Sign** — canonicalize the article body, digest it (SHA-256), build the EIP-712 `AttestationMessage`, sign with the author key → `<article>.attestation.json`.
2. **Stamp** — `stampDigest` submits the digest to OpenTimestamps calendars → `<article>.ots`.
3. **Upgrade** — once anchored in a Bitcoin block, `upgradeProof` completes the proof.
4. **Verify** — anywhere: signature (`verifyAttestation`), timestamp (`verifyOts`), or both from a URL in the browser (`verifyFromUrl`).

## Tests

`npm test` (offline, deterministic). `npm run test:network` opts into the OpenTimestamps-calendar e2e suite.

Reference consumer: [`jterrazz-web`](https://github.com/jterrazz/jterrazz-web) (verify page, proof card, signing scripts).

## Documentation

The full corpus lives in [`docs/`](docs/):

- [Architecture](docs/01-architecture.md) — the four entries, the layers, the browser boundary.
- [Developing](docs/02-developing.md) — the toolchain and where a new file goes.
- [Testing](docs/03-testing.md) — the five test projects and what a golden pins.
- [Operating](docs/04-operating.md) — what publishes it, and which number moves.
- [Signing and anchoring](docs/05-signing-and-anchoring.md) — canonicalization, EIP-712, the digest chain, Bitcoin anchoring.

For agents: read the chapters straight from the repo, plus the [`skills/jterrazz-attestation`](skills/jterrazz-attestation/SKILL.md) Claude Code skill.

MIT © [Jean-Baptiste Terrazzoni](https://github.com/jterrazz)
