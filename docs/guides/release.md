# Release

This repository ships one thing: the npm package `@jterrazz/attestation`, published to the public registry, with the `attestation` binary it carries. There is no service, no image, no infrastructure: releasing it is the whole of shipping it, and this guide is how it is cut and who cuts it.

## What a merge to `main` does

Nothing that reaches a consumer. `.github/workflows/check.yaml` fires on every push and pull request to `main` and calls the shared `studio-actions` `check.yaml` workflow, which runs the build, the lint, the tests and the mutation run. A green `main` is a publishable tree, not a published one: merging this migration, or any other change, deploys nothing and publishes nothing.

## What publishes

`.github/workflows/release.yaml` fires on `release: created` and calls the shared `publish-npm.yaml` workflow with npm provenance (`id-token: write`). That workflow checks again, then runs `make build` and `npm publish --access public --provenance`. So exactly one gesture publishes, and a human makes it: cutting a GitHub Release from a tag. Before the tag, `make rehearse` runs the gate on that commit as the runner will, on Linux ([A rehearsal on Linux](https://github.com/jterrazz/package-typescript/blob/main/docs/reference/commands.md#a-rehearsal-on-linux)), and exits 0.

In this repository's own history the version in `package.json` is bumped in the commit that closes the work being released (for example `2dc101e`, tagged `v0.2.0`), and the tag is what the release is cut from; there is no separate `chore(release)` commit convention here today.

## Which number moves

Semver, read from the consumer's side:

| Change                                                                            | Number |
| --------------------------------------------------------------------------------- | ------ |
| A new export, a new CLI subcommand, a new optional field                          | minor  |
| A new `SCHEMA_VERSION` or `CANONICAL_VERSION` added alongside                     | minor  |
| A removed export or subpath, a renamed CLI flag, a v1 verifier that stops working | major  |
| A fix that does not change any exported shape                                     | patch  |

While the package is `0.x`, each row moves one place right: a "major" change moves the minor (`0.2.1` to `0.3.0`), anything else the patch. A consumer's `^0.2` already pins the minor, so that is the number that tells it to look before it upgrades; `1.0.0` is a decision of its own, never a side effect of the table.

No CHANGELOG is kept: the GitHub Release notes are the only place a breaking change is carried. A cut that breaks something names it there: the release that removes the `./cli` subpath (it ran the CLI and called `process.exit` on import) says so, and points to `@jterrazz/attestation/node` and the `attestation` binary instead.

The frozen contract in [Signing and anchoring](../concepts/signing-and-anchoring.md) is what makes "a v1 verifier that stops working" a major change rather than a patch: it is a promise to every attestation already published, not only to today's consumers.

## Related

- [Test](test.md): what `check.yaml` runs before either gate.
- [Signing and anchoring](../concepts/signing-and-anchoring.md): the versioned contract a release must not silently break.
