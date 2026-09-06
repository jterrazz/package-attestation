# Agent brief — `@jterrazz/attestation`

EIP-712 article attestation anchored to Bitcoin via OpenTimestamps. Four entries: `.` (full Node surface), `./browser` (verify-only, runtime-agnostic), `./node` (OpenTimestamps stamping/verification), `./cli` (`bin/attestation`: sign, verify, upgrade).

## Layout

```
src/core/           # canonicalize, sha256, eip712-schema, audit — pure, runtime-agnostic
src/attestation/    # create/sign, verify, serialize, types
src/ots/            # OpenTimestamps: stamp, upgrade, verify (Node-only)
src/browser/        # verify-from-url, ens — NO Node imports allowed
src/cli/            # the attestation CLI (sign, verify, upgrade)
skills/             # jterrazz-attestation — wiring + domain skill
```

## Rules

- `browser.ts` must stay importable from any runtime: no `fs`, `http`, `node:crypto`, no OpenTimestamps. The boundary IS the export map.
- Canonicalization and the EIP-712 schema are versioned (`CANONICAL_VERSION`, `SCHEMA_VERSION`); any change to either bumps the version and keeps verification of prior versions working.
- Offline by default: `npm test` never touches the network; calendar interactions live behind `test:network` (`ATTEST_E2E_NETWORK=1`).
- `.npmrc` sets `allow-git=all` deliberately (javascript-opentimestamps pins a git ref) — do not remove.
- Module unit tests are siblings; `make build lint test` must stay green.
- Everything a tool writes lands under `.artifacts/<tool>/`, and `make clean` takes that directory away; `dist/` is the published product, not an artefact. The convention and its gate are `@jterrazz/typescript`'s.
