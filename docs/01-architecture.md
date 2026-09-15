# Architecture

Four entry points share one `src/`, split by what each is allowed to import — the shape that lets a browser bundle carry only what a browser can run.

| Entry                           | File             | Runs in     | Carries                                                                           |
| ------------------------------- | ---------------- | ----------- | --------------------------------------------------------------------------------- |
| `@jterrazz/attestation`         | `src/index.ts`   | Node        | Full surface: canonicalize, EIP-712 schema, create/sign, verify, serialize, audit |
| `@jterrazz/attestation/browser` | `src/browser.ts` | any runtime | Verify-only, pure ESM (`@noble/hashes` + `viem`): `verifyFromUrl`, ENS helpers    |
| `@jterrazz/attestation/node`    | `src/node.ts`    | Node        | OpenTimestamps stamping/verification, and the browser-wallet sign flow            |
| `npx attestation` (CLI)         | `src/cli.ts`     | Node        | `sign`, `verify`, `upgrade` — `bin/attestation` re-exports the built entry        |

`tsdown.config.ts` builds all four as separate ESM+CJS bundles from these entry files; the export map in `package.json` is what a consumer actually sees.

## Layers under `src/`

| Folder             | Owns                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `src/primitives/`  | `canonicalize`, `sha256Hex`, the EIP-712 schema, `audit` — pure, runtime-agnostic              |
| `src/attestation/` | `create`/`sign`, `verify`, `serialize`, the on-disk and in-memory `types`                      |
| `src/ots/`         | OpenTimestamps: `stampDigest`, `upgradeProof`, `verifyOts` (Node-only)                         |
| `src/browser/`     | `verifyFromUrl`, ENS resolution, the browser-facing state types — no Node imports allowed      |
| `src/eth/`         | The browser-wallet signing flow: a one-shot localhost HTTP server plus the HTML page it serves |
| `src/cli/`         | The `attestation` command: argument parsing, `sign`/`verify`/`upgrade`, terminal output        |

## The boundary that IS the export map

`src/browser.ts` must stay importable from any modern JS runtime — a browser tab included. It re-exports only from `src/primitives/`, `src/attestation/` and `src/browser/`, and none of those may reach for `fs`, `node:http`, `node:crypto` or the OpenTimestamps library. There is no lint rule enforcing this today; the discipline is the export map itself (`src/index.ts`) and the review of any import added under `src/browser/`.

`src/node.ts` is the opposite promise: it exists to pull in Node-only modules (`fs`, `crypto`, `node:http` via `src/eth/`, the OpenTimestamps library) so that a bundler resolving `@jterrazz/attestation/browser` never touches them.

`src/index.ts`, the full Node surface, is a superset of `src/browser.ts` plus the signing side (`create.ts`) that a verifier does not need.

## The frozen contract

Two files carry a version and are treated as immutable once a single attestation using them is published: `src/primitives/canonicalize.ts` (`CANONICAL_VERSION`) and `src/primitives/eip712-schema.ts` (`SCHEMA_VERSION`), both re-exported from `src/version.ts`. What each freezes, and how a v2 would be introduced alongside without breaking a v1 verifier, is [05-signing-and-anchoring.md](05-signing-and-anchoring.md)'s.

## Related

- [Developing](02-developing.md) — where a new file goes inside this layout.
- [Signing and anchoring](05-signing-and-anchoring.md) — what each layer actually computes.
