# Testing

What proves a change here, and what a golden pins.

```bash
npm test              # vitest --run — every project below except e2e-network
npm run test:network  # + e2e-network (ATTEST_E2E_NETWORK=1)
```

## Five projects, one `vitest.config.ts`

| Project         | Runs                               | Proves                                                                                      |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `unit`          | `src/**/*.test.ts`                 | Each module against its own sibling test — pure functions, no network                       |
| `golden`        | `tests/golden/**/*.test.ts`        | The frozen v1 byte contracts — see below                                                    |
| `integration`   | `tests/integration/**/*.test.ts`   | The full sign → store → load → verify roundtrip, plus tampering and the revision chain      |
| `articles-real` | `tests/articles-real/**/*.test.ts` | The pipeline against real article content, when a sibling checkout supplies any — see below |
| `e2e-network`   | `tests/e2e-network/**/*.test.ts`   | A real OpenTimestamps calendar submission — excluded unless `ATTEST_E2E_NETWORK=1`          |

## What a golden pins

`tests/golden/canonicalize.golden.test.ts` and `tests/golden/attestation.golden.test.ts` snapshot the exact bytes and digest that `canonicalize()` v1 produces for a fixed set of inputs (empty string, CRLF, a leading BOM, combining vs. precomposed diacritics, RTL text, emoji, code-block whitespace). These snapshots ARE the v1 contract: if one changes, every attestation ever signed against v1 becomes unverifiable. A snapshot is updated only by introducing `CANONICAL_VERSION = 2` alongside v1, never by regenerating it in place — see [05-signing-and-anchoring.md](05-signing-and-anchoring.md).

## `articles-real` is optional by design

`tests/articles-real/all-articles-pipeline.test.ts` reads `../../content` relative to the process's working directory — the article tree of a sibling `jterrazz-web` checkout, when this package is worked on nested inside one. When that directory is absent, `readdirSync` throws, the test catches it and the suite discovers zero articles: the project passes with nothing exercised. Today nothing in this repository's own tree supplies that content, so run the suite from a workspace that does when its coverage matters.

## `e2e-network` is opt-in, on purpose

The project's `include` glob is entirely excluded unless `ATTEST_E2E_NETWORK` is set — `vitest.config.ts` reads the environment variable to build the `exclude` list. `npm run test:network` is the one command that sets it. This is the only suite that reaches a real OpenTimestamps calendar; every other project, `unit` through `articles-real`, runs fully offline.

## Related

- [Developing](02-developing.md) — where a new test's module lives.
- [Signing and anchoring](05-signing-and-anchoring.md) — what the frozen contract the goldens pin actually says.
