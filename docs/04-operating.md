# Operating

This repository ships one thing: the npm package `@jterrazz/attestation`, published to the public registry, plus the `attestation` binary it carries. There is no service, no image, no infrastructure — "operating" here means the release, and what a merge to `main` does NOT do.

## What a merge to `main` does

Nothing that reaches a consumer. `.github/workflows/validate.yaml` fires on every push and pull request to `main` and calls the shared `jterrazz-actions` `validate.yaml` workflow, which runs `make build`, `make lint` and `make test`. A green `main` is a publishable tree, not a published one — merging this migration, or any other change, deploys nothing and publishes nothing.

## What publishes

`.github/workflows/release.yaml` fires on `release: created` and calls the shared `release-npm.yaml` workflow with npm provenance (`id-token: write`). That workflow validates again, then runs `make build` and `npm publish --access public --provenance`. So exactly one gesture publishes, and a human makes it: cutting a GitHub Release from a tag.

In this repository's own history the version in `package.json` is bumped in the commit that closes the work being released (for example `2dc101e`, tagged `v0.2.0`), and the tag is what the release is cut from — there is no separate `chore(release)` commit convention here today.

## Which number moves

Semver, read from the consumer's side:

| Change                                                                 | Number |
| ---------------------------------------------------------------------- | ------ |
| A new export, a new CLI subcommand, a new optional field               | minor  |
| A new `SCHEMA_VERSION` or `CANONICAL_VERSION` added alongside          | minor  |
| A removed export, a renamed CLI flag, a v1 verifier that stops working | major  |
| A fix that does not change any exported shape                          | patch  |

The frozen contract in [05-signing-and-anchoring.md](05-signing-and-anchoring.md) is what makes "a v1 verifier that stops working" a major change rather than a patch: it is a promise to every attestation already published, not only to today's consumers.

## Related

- [Testing](03-testing.md) — what `validate.yaml` runs before either gate.
- [Signing and anchoring](05-signing-and-anchoring.md) — the versioned contract a release must not silently break.
