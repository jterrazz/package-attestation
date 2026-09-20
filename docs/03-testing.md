# Testing

What proves a change here, where a new test goes, and what a golden pins.

```bash
npm test              # vitest --run — the unit and integration projects
npm run test:network  # + the live OpenTimestamps folder (ATTEST_E2E_NETWORK=1)
```

## Two projects, one `vitest.config.ts`

| Project       | Collects                         | Proves                                                                  |
| ------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `unit`        | `**/*.test.ts` outside `specs/`  | Each module against its own sibling test — pure functions, no network   |
| `integration` | `specs/integration/**/*.test.ts` | A module against the real thing: a golden, a real file tree, a calendar |

Both come from `@jterrazz/test`'s project helpers — `unit()` and `integration()` — so the timeouts, the artefact directory and the excluded ground are the preset's, not this repository's to restate. What each helper carries is `@jterrazz/test`'s own chapter on the integration facet.

Which of the two a test belongs to is decided by its SUBJECT, never by how much machinery it needs. A module alone is a module test, beside its code. A module whose oracle is a golden file — or that stands on a real file tree or a real network — is an integration spec.

## The spec tree

```text
specs/integration/
├── integration.specification.ts   # the runner, at the facet root — no services
├── golden/                        # the frozen v1 byte contracts
│   ├── attestation.test.ts
│   ├── canonicalize.test.ts
│   └── schema.test.ts
├── articles/                      # the pipeline over article content
│   ├── pipeline.test.ts
│   └── roundtrip.test.ts
└── network/                       # a live OpenTimestamps calendar — gated
    └── ots-stamp.test.ts
```

`specs/integration/integration.specification.ts` declares no `services`: nothing this package integrates with is a container. It is the golden half of the facet: what earns a spec its place here is its ORACLE — a frozen file, a real article tree, a real calendar — never the amount of machinery it starts.

## What a golden pins

`specs/integration/golden/` holds the exact bytes and digests that v1 produces for a fixed set of inputs: the empty string, CRLF, a leading BOM, combining versus precomposed diacritics, RTL text, emoji, code-block whitespace, and one frozen article signed with the Hardhat test wallet. These ARE the v1 contract: if one changes, every attestation ever signed against v1 becomes unverifiable.

A golden here is updated only by introducing `CANONICAL_VERSION = 2` alongside v1, never by regenerating it in place — see [05-signing-and-anchoring.md](05-signing-and-anchoring.md).

## `articles/pipeline.test.ts` is optional by design

`specs/integration/articles/pipeline.test.ts` reads `../../content` relative to the process's working directory — the article tree of a sibling `jterrazz-web` checkout, when this package is worked on nested inside one. When that directory is absent, `readdirSync` throws, the discovery catches it and the suite finds zero articles: the file skips with nothing exercised. Today nothing in this repository's own tree supplies that content, so run it from a workspace that does when its coverage matters.

## `network/` is opt-in, on purpose

The folder is an `exclude` option of the `integration` project, not a project of its own: `vitest.config.ts` reads `ATTEST_E2E_NETWORK` and drops `specs/integration/network/**` from the collection unless it is set. `npm run test:network` is the one command that sets it.

That folder holds the only suite reaching a real OpenTimestamps calendar. Everything else — `unit`, `golden/`, `articles/` — runs fully offline.

## Related

- [Developing](02-developing.md) — where a new test's module lives.
- [Signing and anchoring](05-signing-and-anchoring.md) — what the frozen contract the goldens pin actually says.
