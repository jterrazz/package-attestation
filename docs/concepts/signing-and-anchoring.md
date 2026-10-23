# Signing and anchoring

What an attestation actually proves, in order: the content is exactly what was canonicalized, the signature is exactly who claims it, and, once anchored, the Bitcoin blockchain says when.

## 1. Canonicalize

`canonicalize()` (`src/primitives/canonicalize.ts`) turns an article body into a fixed byte sequence before anything is hashed or signed, so two authors' editors never produce two different signatures for the same words. The rules, in order, are a FROZEN v1 contract:

1. Reject unpaired UTF-16 surrogates (corrupt input) by throwing `InvalidContentError`.
2. Strip a leading BOM (U+FEFF).
3. Apply Unicode NFC normalization.
4. Convert CRLF and stray CR to LF.
5. Trim trailing whitespace and append exactly one LF.
6. Encode as UTF-8 bytes.

No markdown parsing, no per-line trim, no tab-to-space substitution, no interior whitespace collapsing: each would silently change a published article's meaning. `CANONICAL_VERSION` (`src/version.ts`) is published beside `SCHEMA_VERSION` but not written into an attestation: a v1 record's `schemaVersion: 1` is what names canonicalization v1, so a future verifier dispatches on it. Changing a rule above means shipping v1 alongside a new v2, never editing v1 in place. The exact bytes each rule produces for a fixed set of inputs are pinned by the frozen goldens of [Test](../guides/test.md).

`audit()` (`src/primitives/audit.ts`) runs only at sign time, over the canonical bytes, and flags invisible/directional Unicode characters (zero-width space, RTL overrides, and the like) that an author probably did not mean to publish. It is advice, not a rule a verifier applies: `verifyAttestation` never sees it.

## 2. Build and sign

`buildAttestationMessage()` (`src/attestation/create.ts`) canonicalizes the content, SHA-256-hashes it (`sha256Hex`), and assembles the EIP-712 typed message (`src/primitives/eip712-schema.ts`):

| Field                     | Meaning                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`           | `SCHEMA_VERSION`, frozen the same way as `CANONICAL_VERSION`                                                                                                           |
| `subject.title`           | The article title, part of what is signed                                                                                                                              |
| `subject.contentDigest`   | SHA-256 of the canonical bytes                                                                                                                                         |
| `subject.locale`          | The article's locale                                                                                                                                                   |
| `claims.slug`             | The article's slug                                                                                                                                                     |
| `claims.publishedAt`      | Unix seconds                                                                                                                                                           |
| `claims.revision`         | Starts at 1                                                                                                                                                            |
| `claims.priorAttestation` | `NO_PRIOR_ATTESTATION` for a first revision, else the [attestation digest](#the-attestation-digest) of the revision it follows, the chain that links an edit's history |

The domain (`ATTESTATION_DOMAIN_V1`) pins `chainId: 1`, so a signature is scoped to this scheme and cannot be replayed as a signature over an unrelated EIP-712 message on the same chain. `signAttestation()` calls a viem `LocalAccount`'s `signTypedData`; the CLI never holds a private key itself (see § Two ways to sign below).

`toStored`/`fromStored`/`stringify`/`parse` (`src/attestation/serialize.ts`) are the only conversion between the in-memory `SignedAttestation` (a `bigint` `publishedAt`) and the on-disk `StoredAttestation` JSON (`publishedAt` as a string, since JSON has no bigint), which is the `<article>.attestation.json` file. `parse` refuses a document missing a member or holding one of the wrong type with a `TypeError`, and leaves out any member the record does not have; whether the document is authentic is `verifyAttestation`'s to say.

### The attestation digest

A revision names the one it follows by its attestation digest: `attestationDigest()` (`src/attestation/digest.ts`, exported from `.` and `./browser`). It is the EIP-712 `hashTypedData` of the attestation's message under `ATTESTATION_DOMAIN_V1`, the very 32-byte hash its author signed. It is computed over the typed message, never over the JSON file, so a record re-serialized, re-indented or read back with `parse` keeps its digest; the signature and the signer are not part of it. `attestation sign` prints it after writing the attestation, ready for the next revision's `--prior-attestation`; for a record signed earlier, `attestationDigest(parse(json))` gives the same value.

## 3. Verify

`verifyAttestation()` (`src/attestation/verify.ts`) is a pure function of the stored attestation and the article content, in this order: reject an unsupported `schemaVersion`; recompute the digest and reject a mismatch (`content-mismatch`); recover the EIP-712 signer with `recoverTypedDataAddress` and reject a bad signature (`invalid-signature`) or a recovered address that does not match the declared `signerAddress` (`signer-mismatch`). It never re-runs `audit()` and never calls the network. Offline by construction, it runs identically in Node, an Edge runtime, or a browser tab.

## 4. Anchor and verify a Bitcoin timestamp

`stampDigest()` (`src/ots/stamp.ts`) submits the 32-byte content digest to OpenTimestamps calendar servers and returns proof bytes (the `<article>.ots` file) that start calendar-only. `upgradeProof()` re-submits those bytes later (the project's own guidance: after roughly 24h) and returns whether a Bitcoin attestation actually attached this time; the CLI's `attestation upgrade` calls it directly on one or more `.ots` files.

`verifyOts()` (`src/ots/verify.ts`) checks that a proof attests the given digest and, if a Bitcoin attestation is present, returns the block time. It first asks the whitelisted calendars a proof is still pending on for what they now hold, as `upgradeProof` does, without writing anything back. It accepts an `explorerUrl` to look the blocks up on an Esplora-compatible explorer of your own (or a double) instead of the public default, `https://blockstream.info/api`; the CLI passes it as `--explorer`. Every Bitcoin attestation of the proof is checked against its block's merkle root, and the earliest block dates it; one that disagrees fails it. A proof that cannot be read is refused as `invalid-proof`, "Not an OpenTimestamps proof"; a proof whose blocks disagree with it is `invalid-proof` with the reason; a proof with no Bitcoin attestation yet is `pending-bitcoin`. A block the explorer could not show (unreachable after a second try half a second later, refusing, or answering what no block is) leaves the proof undated as `explorer-unreachable`, its details naming the request and what it met: that verdict says nothing of the proof, so a caller retries it rather than keeping it. Each block it trusts is logged (`Lite-client verification, assuming block <hash> is valid`) on stdout, which the CLI's output therefore carries.

### The OpenTimestamps client

The client is the package's own, in `src/ots/`, with no dependency beyond `@noble/hashes`: the `.ots` format (`proof-file.ts`, `timestamp.ts`, `ops.ts`, `attestation.ts`), the calendars (`calendar.ts`), the upgrade (`upgrade.ts`) and the Esplora lookup (`esplora.ts`). It reads and writes what the calendars emit: the hashes `sha1`, `ripemd160`, `sha256` and `keccak256`, `append` and `prepend`, and the pending and Bitcoin attestations; any other notary is kept as its bytes and never verified, an Ethereum attestation among them. A proof read and written back is the same bytes, which the upstream test vectors prove ([Test](../guides/test.md)). Its HTTP goes through `node:http`, so `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY` are honoured, and every calendar and explorer is given 10 s to answer. Each address of a host gets 2 s to connect before the next is tried, not Node's 250 ms: from a network with no IPv6 route, a host 150 ms away over IPv4 otherwise fails on every address at once, the bare `AggregateError` jterrazz.com met on 2026-10-23. Only the calendars of the whitelist in `calendar.ts` are asked to upgrade a proof.

## Two ways to sign

- **The CLI** (`attestation sign <file> --title <t> --slug <s>`, `src/cli/sign.ts`) canonicalizes, audits, builds the message, then calls `signViaBrowser()`; it never holds a private key.
- **`signViaBrowser()`** (`src/eth/sign-flow.ts`, published through `src/eth/browser.ts`) starts a one-shot HTTP server bound to `127.0.0.1` only (`src/eth/loopback.ts`), opens the default browser on it (or hands the URL to `onUrlReady`) serving a page that asks the wallet (`window.ethereum`) for an EIP-712 v4 signature, and resolves once that page posts a 65-byte signature and a 20-byte address to `/done`; anything else is answered 400 and the page may retry. `signBatchViaBrowser()` (`src/eth/sign-batch-flow.ts`) is the same flow for several messages in one wallet session: each signature is posted to `/sig` under its entry's id, each refusal to `/skip`, and `/done` resolves with both maps. The flows themselves take their opener as a required argument: `src/eth/browser.ts` is the one module that hands them the default browser when the consumer names none, and it is excluded from mutation, since a mutant there could only open a window.

## The two verify surfaces

- **`verifyAttestation` + `verifyOts`**, composed by the CLI's `attestation verify <url|file>` (`src/cli/verify.ts`) and by `verifyFromUrl()` (`src/browser/verify-from-url.ts`) for a published article: fetch `{articleUrl}/proof.json` (`src/browser/proof.ts`), then the content, the `.attestation.json` and (unless `skipOts`) an `otsVerifier` endpoint the manifest may point at. OpenTimestamps needs Node's `fs`/`crypto`, so a browser calling `verifyFromUrl` delegates that one leg to a server-side endpoint and reports `skipped` when the manifest names none. A manifest that is no manifest, a page that does not answer 2xx, and an attestation that is none are reported as a `fetch` failure with their reason; a verifier answering something that is no verdict fails the date leg the same way.
- **ENS is decoration only.** `resolveEnsName()` (`src/browser/ens.ts`) reverse-resolves a signer address to a friendlier label for display; it is never persisted in the attestation and never affects whether a signature verifies.

## Related

- [Architecture](architecture.md): which folder each piece above lives in, and the browser/Node boundary.
- [Test](../guides/test.md): the goldens that pin the frozen bytes, and the specs that prove each leg from the tarball.
- [Release](../guides/release.md): why a break to this contract is a major version, not a patch.
