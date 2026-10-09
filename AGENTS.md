# Agent brief — `@jterrazz/attestation`

EIP-712 article attestation anchored to Bitcoin via OpenTimestamps: sign once, verify anywhere. This file **routes**; it does not restate what the manual says.

## Where knowledge lives

The manual is `docs/`, mapped by [docs/README.md](docs/README.md). Read the page before the change; link to it, never copy it.

| Working on…                                             | Read                                     |
| ------------------------------------------------------- | ---------------------------------------- |
| The entries, the folders, the browser boundary          | `docs/concepts/architecture.md`          |
| Canonicalization, EIP-712, signing, OTS anchoring       | `docs/concepts/signing-and-anchoring.md` |
| The declaration, the gestures, where a new file goes    | `docs/guides/develop.md`                 |
| The frozen goldens, the specs from the tarball, doubles | `docs/guides/test.md`                    |
| The release, and which number moves                     | `docs/guides/release.md`                 |
| The `attestation` binary's commands and flags           | `docs/reference/cli.md`                  |

`skills/jterrazz-attestation/` routes agents into this manual for the domain itself — it does not restate it either.

## Setup

```bash
make install
```

## Commands

| Task                                     | Command             |
| ---------------------------------------- | ------------------- |
| Build                                    | `make build`        |
| Every quality gate                       | `make lint`         |
| Apply the fixers                         | `make fix`          |
| Run all tests (offline)                  | `make test`         |
| Run the OpenTimestamps network suite too | `make test-network` |
| Mutation over the change                 | `make mutation`     |
| What CI runs                             | `make check`        |

No test may open a window: the browser the `sign` command opens is a stand-in on `PATH` in the specs ([Test](docs/guides/test.md)).

`CLAUDE.md` at the root is a symlink to this file: one brief, two names, no second copy.
