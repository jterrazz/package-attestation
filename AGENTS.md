# Agent brief — `@jterrazz/attestation`

EIP-712 article attestation anchored to Bitcoin via OpenTimestamps: sign once, verify anywhere. This file **routes**; it does not restate what the corpus already says.

## Where knowledge lives (route here first)

The corpus is `docs/` + `README.md`, mapped by [docs/README.md](docs/README.md). Do not duplicate it — link to it.

| Working on…                                           | Read                               |
| ----------------------------------------------------- | ---------------------------------- |
| The four entries, the layers, the browser boundary    | `docs/01-architecture.md`          |
| The toolchain, where a new file goes, the conventions | `docs/02-developing.md`            |
| The five test projects, what a golden pins            | `docs/03-testing.md`               |
| The release, and which number moves                   | `docs/04-operating.md`             |
| Canonicalization, EIP-712, signing, OTS anchoring     | `docs/05-signing-and-anchoring.md` |

`skills/jterrazz-attestation/` routes agents into this corpus for the domain itself (the two artifacts, which entry to pick, the invariants) — it does not restate it either.

## Setup

```bash
npm ci
```

## Commands

| Task                                     | Command             |
| ---------------------------------------- | ------------------- |
| Build                                    | `make build`        |
| Lint + format + typecheck + knip + docs  | `make lint`         |
| Auto-fix lint issues                     | `make lint-fix`     |
| Run all tests (offline)                  | `make test`         |
| Run the OpenTimestamps network suite too | `make test-network` |

`CLAUDE.md` at the root is a symlink to this file: one brief, two names, no second copy.
