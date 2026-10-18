# Develop

How a change to this package is made: the declaration, the gestures, where a new file goes, and the conventions a diff keeps. What the package IS is [Architecture](../concepts/architecture.md); what PROVES a change is [Test](test.md).

## The declaration and the gestures

`jterrazz.config.ts` says what the repository is (a `library` on `node`, held to `@jterrazz/test`'s preset), and every tool's config is derived from it: `oxlint.config.ts`, `oxfmt.config.ts`, `vitest.config.ts` and `tsconfig.json` are each the one line `typescript fix` writes, and the build, knip and the mutation run keep no config at all. Its one exception, with its reason, is the integration project's exclusion of `specs/integration/network/` unless `ATTEST_E2E_NETWORK` is set.

```bash
make install       # npm ci, once per lockfile
make build         # typescript build into dist/, from the manifest
make lint          # build, then typescript check: every quality gate
make fix           # typescript fix: the fixers, and the derived files
make test          # build, then vitest --run (offline)
make test-network  # + the live OpenTimestamps calendars
make mutation      # typescript mutation: zero survivors over the change
make check         # lint, test, mutation: what CI runs
```

`lint` and `test` build first: the Publish pass reads `dist/`, and the specs install the tarball `npm pack` writes from it.

## Where a new file goes

A module's home is one of the six folders of [Architecture § The folders](../concepts/architecture.md#the-folders-under-src), chosen by which entry needs it, never a shared `utils.ts`:

- a pure, runtime-agnostic helper (hashing, encoding, the schema, reading JSON) goes in `src/primitives/`;
- what builds, signs, verifies or serializes the record goes in `src/attestation/`;
- what talks to OpenTimestamps goes in `src/ots/`, exported from `src/index.node.ts` and never from the browser entry;
- what the browser entry re-exports goes in `src/browser/`, and imports no Node module;
- the wallet's loopback flows go in `src/eth/`, Node-only;
- a command of the binary goes in `src/cli/`, its dispatch in `src/cli/dispatch.ts`.

A new entry is a new `exports` subpath and its `src/index.<subpath>.ts`; the build derives it from the manifest.

## Conventions a change keeps

- **The frozen contract never moves.** `CANONICAL_VERSION` and `SCHEMA_VERSION` (`src/version.ts`) move only by adding a version beside the old one, never by editing `canonicalize()` or the EIP-712 schema in place; the old version's verifier keeps working ([Signing and anchoring](../concepts/signing-and-anchoring.md)).
- **Audit runs at sign time only.** `src/primitives/audit.ts` advises the author; a verifier is a function of `canonicalize()` alone, so an honestly signed attestation never fails a newer verifier.
- **A user error is refused in four parts.** `src/cli/refusal.ts` throws a `RefusalError` (found, why, fix, and the section of [the CLI reference](../reference/cli.md) to read), which the binary prints on stderr, exiting 1; any other error is a failure, printed `Error: <what>`. Argument and audit refusals come before the wallet is asked, and a signature that does not verify is refused before the attestation is written; a stamp no calendar answered fails after it, and leaves it in place ([the CLI reference](../reference/cli.md#sign) says how to stamp it then). JSON from outside (a stored attestation, a manifest, a verifier's verdict, a wallet's post) is read as `unknown` and checked against its shape before it is trusted.
- **`.npmrc` keeps `allow-git=all`.** `javascript-opentimestamps` pins `bignumber.js` to a git ref, and npm refuses a git dependency without it.
- **Offline by default.** `npm test` reaches no network: the Bitcoin explorer, the wallet and the article sites are doubles ([Test](test.md)). Only `specs/integration/network/` reaches the live calendars.
- **Comments default to none**; one that stays states its kind (`invariant:`, `hazard:`, `outside:`, `value:`), and a published symbol keeps a one-line hover.

## Related

- [Architecture](../concepts/architecture.md): the layout these rules assume.
- [Test](test.md): the suites a change must pass.
- [Release](release.md): what publishes the package.
