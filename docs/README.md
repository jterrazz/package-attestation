# @jterrazz/attestation — the manual

Article attestation: an EIP-712 signature over the canonical bytes of an article, anchored to Bitcoin through OpenTimestamps. What the package is and how a consumer starts using it is the repository's README; this page lists every page of the manual, by what the reader came to do.

## Guides

| Page                         | Answers                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [Develop](guides/develop.md) | Changing the package: the declaration, the gestures, where a new file goes, the conventions a change keeps       |
| [Test](guides/test.md)       | Proving a change: the frozen goldens, the specs that install the tarball, the doubles they stand on, the mutants |
| [Release](guides/release.md) | How the package is published, who cuts a release, and which number moves                                         |

## Concepts

| Page                                                       | Answers                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [Architecture](concepts/architecture.md)                   | The three entries and the bin, the folders behind them, the boundary the browser entry keeps |
| [Signing and anchoring](concepts/signing-and-anchoring.md) | What an attestation proves: canonicalization, the EIP-712 schema, the digest chain, Bitcoin  |

## Reference

| Page                        | Answers                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| [The CLI](reference/cli.md) | Every command of the `attestation` binary, its flags, its output and exit codes |

## Decisions

No decision recorded here spans only this repository yet; a `decisions/` folder opens the day one does. A decision spanning several repositories is recorded by the corpus that spans them.
