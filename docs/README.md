# @jterrazz/attestation — the corpus

The manual of this repository: what it signs, how it is changed, and what proves it works. The vitrine is the root `README.md`.

| Chapter                                                    | Holds                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [01-architecture.md](01-architecture.md)                   | The four entries, the layers behind them, and the boundary that keeps the browser one runtime-agnostic              |
| [02-developing.md](02-developing.md)                       | The toolchain, where a new file goes, and the conventions a change must keep                                        |
| [03-testing.md](03-testing.md)                             | The five test projects, what a golden pins, and how the network suite opts in                                       |
| [04-operating.md](04-operating.md)                         | What publishes this package, what a merge to `main` does NOT do, and who cuts a release                             |
| [05-signing-and-anchoring.md](05-signing-and-anchoring.md) | The domain itself: canonicalization, the EIP-712 schema, the digest chain, and Bitcoin anchoring via OpenTimestamps |

No decision recorded here spans only this repository yet — a repository-local `docs/decisions/` opens the day one does.
