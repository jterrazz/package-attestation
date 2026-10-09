# Test

What proves a change here, where a new test goes, and what each double stands for.

```bash
make test          # build, then the unit, integration and cli projects — offline
make test-network  # + specs/integration/network/, the live OpenTimestamps calendars
make mutation      # the mutants of the change, against the whole suite
```

## Three projects, read off the tree

| Project       | Collects                         | Proves                                                                  |
| ------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `unit`        | `src/**/__tests__/*.test.ts`     | the two pure algorithms whose edge cases are cheaper at their own level |
| `integration` | `specs/integration/**/*.spec.ts` | the frozen v1 contract: a module against a golden                       |
| `cli`         | `specs/cli/**/*.spec.ts`         | everything the package publishes, from the tarball a consumer installs  |

Nothing declares them: `@jterrazz/test` derives each from its folder. End to end is the default — a behaviour a consumer relies on is specified through what the consumer installs; a module test is kept only for `canonicalize` and `audit`, two pure algorithms (`src/primitives/__tests__/`).

## The frozen contract — `specs/integration/`

```text
specs/integration/
├── integration.specification.ts   # the runner — no services
├── __setup__/wallet.ts            # Hardhat's account 0, the specs' signer
├── canonicalize/                  # the bytes and digest of fourteen inputs
├── schema/                        # the EIP-712 type table and the digest it hashes to
├── attestation/                   # one frozen article: its signature, its document, its verdict
├── storage/                       # five articles written, read back and verified
└── network/                       # the live calendars — collected only under ATTEST_E2E_NETWORK
```

Every golden here carries `{ frozen: true }`: update mode never writes it, and a mismatch throws its diff. They are the v1 contract — if one changes, every attestation ever signed against v1 becomes unverifiable. A golden retires only with a `CANONICAL_VERSION` or `SCHEMA_VERSION` 2 beside v1, never by regenerating it; writing a NEW case is the one time `{ frozen: true }` is dropped, for one `TEST_UPDATE=1` run, and put back. `attestation/__expected__/serialized.txt` stays a file on purpose: its bytes — two-space indentation, one trailing line break — are what lands on disk, which a value written in the test would compare as JSON.

## The package from its tarball — `specs/cli/`

Every spec here links `@jterrazz/attestation` packed — `npm pack` over the build, installed in the spec's working directory as a consumer installs it — and runs it through `node`:

- `node/` runs consumer scripts (`node/__fixtures__/consumer/*.mjs`) against the installed entries: the names each subpath publishes under `import` and `require` (`subpaths`), building and signing messages (`message`), every verdict of `verifyAttestation` (`verify`), the stored document and the documents `parse` refuses (`storage`), `verifyFromUrl` through a fetch double (`from-url`), OpenTimestamps (`ots`), and the two loopback sign flows, the consumer standing in for the browser page (`sign-flow`, `sign-batch`).
- `attestation/` runs the installed binary, `node_modules/.bin/attestation`: its usage, `sign`, `verify`, `upgrade`, and every refusal.

### The doubles, and why nothing opens a window

- **The wallet.** `sign` opens the default browser on its loopback page. The spec puts a stand-in first on `PATH` — `attestation/__fixtures__/wallet/bin/open`, a node script that reads the page, signs its typed data with Hardhat's account 0 and posts the signature back — and leaves `/usr/bin`, where macOS keeps `open`, off `PATH`; on Linux the `open` package's bundled `xdg-open` hands the URL to `$BROWSER`, which the spec points at the same stand-in. The attestation it writes is the frozen one, byte for byte.
- **The Bitcoin explorer.** `__fixtures__/signews/` is a published article (jterrazz.com's "Mapping the noise"), its attestation and its real anchored proof. An Esplora double — in `ots.mjs`, and in `verify.spec.ts` for the binary — answers its three blocks with the merkle roots the proof computes, so the date is verified offline: 2026-05-09T14:51:40Z.
- **The calendars.** A calendar-only proof names `https://calendar.example.invalid`, a calendar off the library's whitelist: verifying or upgrading it asks nothing of the network and reads `pending-bitcoin`.
- **The article sites.** `from-url.mjs` hands `verifyFromUrl` a fetch double; `verify.spec.ts` serves the SigNews article on 127.0.0.1 for the binary.

`resolveEnsName` and `stampDigest`'s submission reach the network by design: the first is specified with the global fetch replaced (every attempt refused, the answer `null`), the second only by `make test-network`.

## The mutants no test kills

`make mutation` (`typescript mutation`) mutates the lines of the change — the work tree against `HEAD`, or the last commit on a clean tree — and runs the whole suite against each mutant, the spawned consumer processes included: they carry the mutation reporter through `NODE_OPTIONS`, which the specs never clear. To measure more than the last commit, name its base: `npx typescript mutation --since <commit>`. A mutant no test can tell from the code is declared where it stands, `// Stryker disable next-line <mutators>: <why>`.

## Related

- [Develop](develop.md) — where a new module, and so its test, goes.
- [Signing and anchoring](../concepts/signing-and-anchoring.md) — what the frozen contract says.
