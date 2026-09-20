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
| `integration` | `specs/integration/**/*.spec.ts` | A module against the real thing: a golden, a real file tree, a calendar |

Both come from `@jterrazz/test`'s project helpers — `unit()` and `integration()` — so the timeouts, the artefact directory and the excluded ground are the preset's, not this repository's to restate. What each helper carries is `@jterrazz/test`'s own chapter on the integration facet.

Which of the two a test belongs to is decided by its SUBJECT, never by how much machinery it needs. A module alone is a module test, beside its code. A module whose oracle is a golden file — or that stands on a real file tree or a real network — is an integration spec.

The SUFFIX says which of the two a file is, and the two projects collect by it: `<module>.test.ts` beside the module it covers, `<aspect>.spec.ts` inside its domain under `specs/integration/`. A `.test.ts` filed under `specs/` is a naming error the conventions checker renames for you (`npx jterrazz-test-check --fix`).

## The spec tree

```text
specs/integration/
├── integration.specification.ts   # the runner, at the facet root — no services
├── golden/                        # the frozen v1 byte contracts
│   ├── attestation.spec.ts
│   ├── canonicalize.spec.ts
│   └── schema.spec.ts
├── storage/                       # the stored record, over five article shapes
│   ├── roundtrip.spec.ts
│   └── _expected/                 # the five frozen records it alone reads
├── articles/                      # the pipeline over a real article tree
│   └── pipeline.spec.ts
└── network/                       # a live OpenTimestamps calendar — gated
    └── ots-stamp.spec.ts
```

`specs/integration/integration.specification.ts` declares no `services`: nothing this package integrates with is a container. It is the golden half of the facet — what earns a spec its place here is its ORACLE, never the amount of machinery it starts.

Every spec calls its module through `integration.call(…)`, so what the module returned reads as `result.value` and what it threw as `result.error`: a refusal is specified the same size as a success, with no `try`/`catch` in the test.

## What a golden pins

A golden is a file under a domain's `_expected/`, compared whole by `expect(result.value).toMatch('<name>.<ext>')` — `.json` when the module returned a value, `.txt` when it returned a string. `TEST_UPDATE=1` rewrites a mismatching one from the actual output.

Which is exactly what must never happen here, so every golden of this package carries `{ frozen: true }`: update mode refuses to write it, and a mismatch throws its diff instead. The twenty-four of them are the v1 contract — the bytes and digest `canonicalize()` produces for the empty string, CRLF, a leading BOM, combining versus precomposed diacritics, RTL text, emoji and code-block whitespace; the EIP-712 type table and the digest it hashes to; the signature, the serialized document and the verdict of one frozen article; and the stored record of five more. If one changes, every attestation ever signed against v1 becomes unverifiable.

A golden here is retired only by introducing `CANONICAL_VERSION = 2` alongside v1, never by regenerating it in place — see [05-signing-and-anchoring.md](05-signing-and-anchoring.md). Dropping `{ frozen: true }` for one `TEST_UPDATE=1` run is how a NEW case is written, and the flag goes straight back.

## `articles/pipeline.spec.ts` is optional by design

`specs/integration/articles/pipeline.spec.ts` reads `../../content` relative to the process's working directory — the article tree of a sibling `jterrazz-web` checkout, when this package is worked on nested inside one. When that directory is absent, `readdirSync` throws, the discovery catches it and the suite finds zero articles: the file skips with nothing exercised. Today nothing in this repository's own tree supplies that content, so run it from a workspace that does when its coverage matters.

## `network/` is opt-in, on purpose

The folder is an `exclude` option of the `integration` project, not a project of its own: `vitest.config.ts` reads `ATTEST_E2E_NETWORK` and drops `specs/integration/network/**` from the collection unless it is set. `npm run test:network` is the one command that sets it.

That folder holds the only suite reaching a real OpenTimestamps calendar. Everything else — `unit`, `golden/`, `storage/`, `articles/` — runs fully offline.

## Related

- [Developing](02-developing.md) — where a new test's module lives.
- [Signing and anchoring](05-signing-and-anchoring.md) — what the frozen contract the goldens pin actually says.
