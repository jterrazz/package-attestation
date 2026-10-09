# The CLI

The `attestation` binary, installed with the package (`npx attestation`). It holds no key: `sign` asks the author's browser wallet. Output is coloured on a terminal unless `NO_COLOR` is set.

| Exit code | Means                                                                       |
| --------- | --------------------------------------------------------------------------- |
| `0`       | done, or usage printed (`attestation`, `-h`, `--help`, `help`)              |
| `1`       | a refusal or a failure, as `Error: <what>` on stderr; a verification failed |
| `2`       | no such command — the usage follows on stderr                               |

## `attestation sign <file>`

Canonicalizes the article, audits it, builds the EIP-712 message, opens the default browser on a page served on 127.0.0.1 for the wallet to sign, writes `<name>.attestation.json` beside the file, then submits the digest to the OpenTimestamps calendars and writes the calendar-only `<name>.ots`.

| Flag                        | Means                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `--title <t>`, `--slug <s>` | required, both signed                                                                      |
| `--locale <l>`              | the article's locale; by default the file's name, which must then be two letters (`en.md`) |
| `--published-at <iso>`      | the publication date, signed in unix seconds; now by default                               |
| `--revision <n>`            | a positive integer; 1 by default                                                           |
| `--prior-attestation <0x…>` | the 32-byte digest of the attestation this revision follows; 32 zero bytes by default      |
| `--skip-audit`              | signs even an article holding invisible or directional characters                          |
| `--skip-stamp`              | writes no `.ots`                                                                           |

The audit refuses before anything is signed, naming each character by line, column and code point. A missing title or slug, a file name that names no locale, a revision, a prior attestation or a date that is none, and a file that does not exist are each refused in one line.

## `attestation verify <url|file>`

Verifies the signature of an article — a local markdown file with its `<name>.attestation.json` (and `<name>.ots`, when present) beside it, or a published article's URL, read through its `proof.json` — then its Bitcoin date when a proof is there. A proof still pending its block passes; a content that is not what was signed, a signature that does not recover to its declared signer, and a proof that is none or whose blocks disagree fail.

| Flag                   | Means                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `--skip-ots`           | checks the signature alone                                                                    |
| `--explorer <esplora>` | looks the Bitcoin blocks up on this Esplora-compatible explorer instead of the public default |

## `attestation upgrade <ots-file> …`

Asks the calendars, for each calendar-only proof, for the Bitcoin attestation they now hold, and rewrites the file when one was attached; a proof already anchored, or whose calendars have nothing yet, is left untouched. Naming no file, or a file that is no proof, is refused.

## Related

- [Signing and anchoring](../concepts/signing-and-anchoring.md) — what each command computes.
