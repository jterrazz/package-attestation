---
name: jterrazz-attestation
description: Cryptographic article attestation via @jterrazz/attestation — EIP-712 signature over canonicalized content, Bitcoin anchoring through OpenTimestamps, browser-safe verification. Use when signing or verifying article attestations, working with .attestation.json / .ots files, the attestation CLI (sign, verify, upgrade), canonicalization, content digests, or proof/verify pages.
---

# @jterrazz/attestation — sign once, verify anywhere

An attestation proves an article existed, unmodified, at a point in time, signed by its author: EIP-712 signature over the canonicalized content digest, anchored to Bitcoin via OpenTimestamps.

## The two artifacts

- `<article>.attestation.json` — the signed EIP-712 claims (`StoredAttestation`): subject (slug, digest, canonical version), claims (publishedAt, prior digest), signature.
- `<article>.ots` — the OpenTimestamps proof of the digest; starts pending, becomes Bitcoin-anchored after `upgrade`.

## Pick the right entry

| Task                                   | Entry                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Sign, serialize, audit, full verify    | `@jterrazz/attestation` (Node)                                                                                     |
| Verify in a page/component             | `@jterrazz/attestation/browser` — pure ESM, no Node imports; `verifyFromUrl` does the whole dance from public URLs |
| Stamp/upgrade/verify the Bitcoin proof | `@jterrazz/attestation/node` (`stampDigest`, `upgradeProof`, `verifyOts`)                                          |
| One-off operations                     | `npx attestation sign                                                                                              | verify | upgrade` |

## Invariants (do not fight them)

- **Canonicalize before digesting** — the signature covers the canonical form, not the raw file. `CANONICAL_VERSION`/`SCHEMA_VERSION` are versioned: changing either means a new version that still verifies the old ones.
- **The browser entry stays runtime-agnostic** — never add a Node-only import there; the export map is the boundary.
- **The digest chain** — `claims.prior` links attestations (`NO_PRIOR_ATTESTATION` for the first); a retitle/edit re-signs with the previous digest as prior.
- Verification is offline; only stamping/upgrading talks to OpenTimestamps calendars (opt-in tests: `npm run test:network`).

## Reference consumer

`jterrazz-web`: verify page (`/articles/<slug>/verify`), proof-card, `verify-ots.json` route, and the signing pipeline (`scripts/sign-all.ts`, `scripts/attach-bitcoin-timestamps.ts`).
