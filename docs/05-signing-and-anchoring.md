# Signing and anchoring

What an attestation actually proves, in order: the content is exactly what was canonicalized, the signature is exactly who claims it, and — once anchored — the Bitcoin blockchain says when.

## 1. Canonicalize

`canonicalize()` (`src/primitives/canonicalize.ts`) turns an article body into a fixed byte sequence before anything is hashed or signed, so two authors' editors never produce two different signatures for the same words. The rules, in order, are a FROZEN v1 contract:

1. Reject unpaired UTF-16 surrogates (corrupt input) — throws `InvalidContentError`.
2. Strip a leading BOM (U+FEFF).
3. Apply Unicode NFC normalization.
4. Convert CRLF and stray CR to LF.
5. Trim trailing whitespace and append exactly one LF.
6. Encode as UTF-8 bytes.

No markdown parsing, no per-line trim, no tab-to-space substitution, no interior whitespace collapsing — each would silently change a published article's meaning. `CANONICAL_VERSION` (`src/version.ts`) is embedded in every attestation so a future verifier can dispatch on it; changing a rule above means shipping v1 alongside a new v2, never editing v1 in place. The exact bytes each rule produces for a fixed set of inputs are pinned by the goldens in [03-testing.md](03-testing.md).

`audit()` (`src/primitives/audit.ts`) runs only at sign time, over the canonical bytes, and flags invisible/directional Unicode characters (zero-width space, RTL overrides, and the like) that an author probably did not mean to publish. It is advice, not a rule a verifier applies — `verifyAttestation` never sees it.

## 2. Build and sign

`buildAttestationMessage()` (`src/attestation/create.ts`) canonicalizes the content, SHA-256-hashes it (`sha256Hex`), and assembles the EIP-712 typed message (`src/primitives/eip712-schema.ts`):

| Field                     | Meaning                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`           | `SCHEMA_VERSION`, frozen the same way as `CANONICAL_VERSION`                                                                           |
| `subject.title`           | The article title, part of what is signed                                                                                              |
| `subject.contentDigest`   | SHA-256 of the canonical bytes                                                                                                         |
| `subject.locale`          | The article's locale                                                                                                                   |
| `claims.slug`             | The article's slug                                                                                                                     |
| `claims.publishedAt`      | Unix seconds                                                                                                                           |
| `claims.revision`         | Starts at 1                                                                                                                            |
| `claims.priorAttestation` | `NO_PRIOR_ATTESTATION` for a first revision, else the previous attestation's reference — the digest chain that links an edit's history |

The domain (`ATTESTATION_DOMAIN_V1`) pins `chainId: 1`, so a signature is scoped to this scheme and cannot be replayed as a signature over an unrelated EIP-712 message on the same chain. `signAttestation()` calls a viem `LocalAccount`'s `signTypedData`; the CLI never holds a private key itself — see § Two ways to sign below.

`toStored`/`fromStored`/`stringify`/`parse` (`src/attestation/serialize.ts`) are the only conversion between the in-memory `SignedAttestation` (a `bigint` `publishedAt`) and the on-disk `StoredAttestation` JSON (`publishedAt` as a string, since JSON has no bigint) — the `<article>.attestation.json` file.

## 3. Verify

`verifyAttestation()` (`src/attestation/verify.ts`) is a pure function of the stored attestation and the article content, in this order: reject an unsupported `schemaVersion`; recompute the digest and reject a mismatch (`content-mismatch`); recover the EIP-712 signer with `recoverTypedDataAddress` and reject a bad signature (`invalid-signature`) or a recovered address that does not match the declared `signerAddress` (`signer-mismatch`). It never re-runs `audit()` and never calls the network — offline by construction, so it runs identically in Node, an Edge runtime, or a browser tab.

## 4. Anchor and verify a Bitcoin timestamp

`stampDigest()` (`src/ots/stamp.ts`) submits the 32-byte content digest to OpenTimestamps calendar servers and returns proof bytes — the `<article>.ots` file — that start calendar-only. `upgradeProof()` re-submits those bytes later (the project's own guidance: after roughly 24h) and returns whether a Bitcoin attestation actually attached this time; the CLI's `attestation upgrade` calls it directly on one or more `.ots` files.

`verifyOts()` (`src/ots/verify.ts`) checks that a proof attests the given digest and, if a Bitcoin attestation is present, returns the block time. It accepts an `explorerUrl` override to point the Merkle-path lookup at a self-hosted or stubbed Esplora-compatible endpoint instead of the library's public default — both spellings of the underlying flag (`ignore_bitcoin_node` and `ignoreBitcoinNode`) are passed together because the library's own documentation and code disagree on the name (`src/ots/verify.ts:78`).

## Two ways to sign

- **The CLI** (`attestation sign <file> --title <t> --slug <s>`, `src/cli/sign.ts`) canonicalizes, audits, builds the message, then calls `signViaBrowser()` — it never holds a private key.
- **`signViaBrowser()`** (`src/eth/sign-flow.ts`) starts a one-shot HTTP server bound to `127.0.0.1` only, opens a browser tab (or calls `onUrlReady`, for tests) serving a page that asks a wallet extension to sign the EIP-712 message, and resolves once that page POSTs the signature back to `/done`. `signBatchViaBrowser()` (`src/eth/sign-batch-flow.ts`) is the same flow for several messages signed in one wallet session.

## The two verify surfaces

- **`verifyAttestation` + `verifyOts`**, composed by the CLI's `attestation verify <url|file>` (`src/cli/verify.ts`) and by `verifyFromUrl()` (`src/browser/verify-from-url.ts`) for a published article: fetch `{articleUrl}/proof.json`, then the content, the `.attestation.json` and (unless `skipOts`) an `otsVerifier` endpoint the manifest may point at — OpenTimestamps needs Node's `fs`/`crypto`, so a browser calling `verifyFromUrl` delegates that one leg to a server-side endpoint and reports `skipped` when the manifest names none.
- **ENS is decoration only.** `resolveEnsName()` (`src/browser/ens.ts`) reverse-resolves a signer address to a friendlier label for display; it is never persisted in the attestation and never affects whether a signature verifies.

## Related

- [Architecture](01-architecture.md) — which layer each piece above lives in, and the browser/Node boundary.
- [Testing](03-testing.md) — the goldens that pin the frozen bytes, and the network suite that proves the OpenTimestamps calls for real.
- [Operating](04-operating.md) — why a break to this contract is a major version, not a patch.
