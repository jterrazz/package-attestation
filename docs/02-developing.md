# Developing

How a change to this package is made — the toolchain, where a new file goes, and the conventions a diff must keep. What the package IS is [01-architecture.md](01-architecture.md); what PROVES a change is [03-testing.md](03-testing.md).

## The toolchain

```bash
npm ci              # install (make build/lint/test all depend on this)
make build           # tsdown → dist/
make lint            # typescript check — every quality gate, in parallel
make lint-fix        # typescript fix
make test            # vitest --run (offline projects only)
make test-network    # + the OpenTimestamps-calendar e2e project
make clean           # rm -rf .artifacts dist
```

Quality is the `@jterrazz` toolchain. `@jterrazz/typescript` carries tsc, oxlint, oxfmt and knip along with the gate that runs them, and `@jterrazz/test` carries the spec conventions. This package names the `library` profile — it publishes to a registry — composed with that testing fragment, so `oxlint.config.ts`, `oxfmt.config.ts` and `tsconfig.json` are each one line of naming it. A local rule override or `compilerOption` is a smell: the fix belongs upstream, where every project of the estate gets the same answer.

`tsdown` is the one build tool this package still declares itself. `typescript bundle` builds a single `src/index.ts`, and this package publishes four entries ([01-architecture.md](01-architecture.md)), so `tsdown.config.ts` states them and `make build` calls tsdown directly.

`oxlint.baseline.json` records the diagnostics this tree carried on the day it adopted the v10 rulebook. The gate judges oxlint against it and the count may only fall: a rule going up, a rule nobody recorded, or an entry that has reached zero all fail the pass. What each entry stands for is the commit that wrote it.

Every build, test and lint artefact lands under `.artifacts/<tool>/`, which `make clean` removes; `dist/` is the published product, not an artefact — it survives `make clean` only in the sense that `make build` regenerates it, and `.gitignore` still lists it as ignored.

## Where a new file goes

A module's home is one of the six folders in [01-architecture.md](01-architecture.md) § Layers, chosen by which entry point needs it — never a shared `utils.ts`. Concretely:

- A pure, runtime-agnostic primitive (hashing, encoding, schema data) goes in `src/primitives/`.
- Anything that builds, signs, verifies or serializes an attestation record goes in `src/attestation/`.
- Anything that talks to OpenTimestamps goes in `src/ots/` and is exported from `src/node.ts`, never from `src/browser.ts`.
- Anything the browser entry re-exports goes in `src/browser/`, and the file must not import a Node-only module — see [01-architecture.md](01-architecture.md) § The boundary that IS the export map.
- The wallet-signing HTTP flow (`src/eth/`) is Node-only and exported from `src/node.ts`.
- A CLI subcommand's parsing and terminal output go in `src/cli/`; the command dispatch table is `src/cli/index.ts`.

A module's unit test is its sibling (`create.ts` / `create.test.ts`); a test that proves something across modules goes under `tests/` — which suite, in [03-testing.md](03-testing.md).

## Conventions a change must keep

- **The frozen contract never moves.** `CANONICAL_VERSION` and `SCHEMA_VERSION` (`src/version.ts`) are each bumped only by adding a new version alongside the old one — never by editing `canonicalize()` or the EIP-712 schema in place. A verifier for the old version must keep working. See [05-signing-and-anchoring.md](05-signing-and-anchoring.md).
- **`src/primitives/` is named after what it holds.** The toolchain's Names (tree) pass refuses `core`, `shared`, `utils` and the seven other words that say nothing about a directory's subject.
- **`.npmrc` sets `allow-git=all` deliberately** — `javascript-opentimestamps` is pinned to a git ref in `package.json`, and npm refuses a git dependency without it. Do not remove the line.
- **Offline by default.** `npm test` never touches the network. Anything that calls an OpenTimestamps calendar or a Bitcoin block-info source lives behind the `e2e-network` project, gated by `ATTEST_E2E_NETWORK=1` (`npm run test:network`).
- **Audit runs at sign time only.** `src/primitives/audit.ts` is advice for the author signing a file, never a rule `verifyAttestation` applies — a verifier is a pure function of `canonicalize()` alone, and adding a stricter check there would make an old, honestly-signed attestation fail a newer verifier.

## Related

- [Architecture](01-architecture.md) — the layout these rules assume.
- [Testing](03-testing.md) — the suites a change must pass.
- [Signing and anchoring](05-signing-and-anchoring.md) — the domain rules a new file must not fight.
