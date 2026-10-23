# Architecture

Three entries and one binary share one `src/`, split by what each is allowed to import. That shape lets a browser bundle carry only what a browser can run.

| Entry                           | Source                   | Runs in     | Carries                                                                                 |
| ------------------------------- | ------------------------ | ----------- | --------------------------------------------------------------------------------------- |
| `@jterrazz/attestation`         | `src/index.ts`           | Node        | canonicalize, audit, the EIP-712 schema, create and sign, serialize, verify             |
| `@jterrazz/attestation/browser` | `src/index.browser.ts`   | any runtime | verify-only, pure ESM (`@noble/hashes` + `viem`): `verifyFromUrl`, `resolveEnsName`     |
| `@jterrazz/attestation/node`    | `src/index.node.ts`      | Node        | OpenTimestamps (`stampDigest`, `upgradeProof`, `verifyOts`) and the wallet's sign flows |
| the `attestation` binary        | `src/attestation.bin.ts` | Node        | `sign`, `verify`, `upgrade` ([The CLI](../reference/cli.md))                            |

Nothing declares the build: `typescript build` reads the manifest (each `exports` subpath under its `import` and `require` conditions, and the `bin`) and compiles each target from the source its name gives by convention, ESM and CommonJS with their declarations ([`@jterrazz/typescript`'s Building](https://github.com/jterrazz/package-typescript/blob/main/docs/reference/building.md)). The binary's source carries its `#!/usr/bin/env node` line, which the build keeps.

## The folders under `src/`

| Folder             | Owns                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/primitives/`  | `canonicalize`, `audit`, `sha256Hex`, the EIP-712 schema, and the two helpers every reader of JSON shares (`hasShape`, `messageOf`), pure and runtime-agnostic |
| `src/attestation/` | the record (`record.ts`), building and signing it (`create.ts`), writing and reading it (`serialize.ts`), verifying it (`verify.ts`)                           |
| `src/browser/`     | `verifyFromUrl`, the `proof.json` manifest a published article serves, ENS display names; no Node module allowed                                               |
| `src/ots/`         | OpenTimestamps: the `.ots` format, the calendars, stamp, upgrade, verify; Node-only                                                                            |
| `src/eth/`         | the wallet's sign flows: a one-shot server on 127.0.0.1, the pages it serves, the EIP-712 v4 payload a browser wallet signs                                    |
| `src/cli/`         | the `attestation` binary: dispatch, `sign`, `verify`, `upgrade`, terminal output                                                                               |

## The boundary the browser entry keeps

`src/index.browser.ts` stays importable from any modern JavaScript runtime, a browser tab included. It re-exports only from `src/primitives/`, `src/attestation/` and `src/browser/`, and none of those may reach `fs`, `node:http`, `node:crypto` or `src/ots/`. No lint rule holds it today: the spec `specs/cli/node/subpaths.spec.ts` pins every name each entry publishes, and a review of any import added under `src/browser/` holds the rest.

`src/index.node.ts` is the opposite promise: it exists to reach the Node-only modules, so a bundler resolving `@jterrazz/attestation/browser` never touches them. The CLI is Node too, and reads a published article through the browser folder's manifest helpers, which run anywhere.

## The frozen contract

Two things carry a version and are immutable once a single attestation using them is published: the canonicalization rules (`src/primitives/canonicalize.ts`, `CANONICAL_VERSION`) and the EIP-712 schema (`src/primitives/eip712-schema.ts`, `SCHEMA_VERSION`), both versions declared in `src/version.ts`. What each freezes, and how a v2 is added beside v1 without breaking a v1 verifier, is [Signing and anchoring](signing-and-anchoring.md)'s.

## Related

- [Develop](../guides/develop.md): where a new file goes inside this layout.
- [Signing and anchoring](signing-and-anchoring.md): what each folder computes.
