# The CLI

The `attestation` binary: `npx @jterrazz/attestation <command>` for one-off use, `attestation <command>` (from `node_modules/.bin`, or `npx attestation` inside the project) once the package is installed. It holds no key: `sign` asks the author's browser wallet. Output is coloured on a terminal unless `NO_COLOR` is set.

| Exit code | Means                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------- |
| `0`       | done, or usage printed (`attestation`, `-h`, `--help`, `help`; `<command> --help` for one command) |
| `1`       | a refusal on stderr, a failure as `Error: <what>` on stderr, or a verification that failed         |
| `2`       | no such command; the usage follows on stderr                                                       |

A refusal is a user error, said in four parts on one line (`found: ... · why: ... · fix: ... · read: <the section of this page>`), and nothing is written after it. Every command refuses a flag it does not have, a flag given twice, a value missing (a value starting with `--` is given as `--flag=<value>`) or given to a switch, and an operand more than it reads. `-h` or `--help` anywhere before `--` prints that command's usage instead of running it.

## sign

`attestation sign <file> --title <t> --slug <s> [flags]` canonicalizes the article, audits it, builds the EIP-712 message, opens the default browser on a page served on 127.0.0.1 for the wallet to sign, writes `<name>.attestation.json` beside the file and prints its attestation digest, then submits the digest to the OpenTimestamps calendars and writes the calendar-only `<name>.ots`.

| Flag                          | Means                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--title <t>`, `--slug <s>`   | required, both signed                                                                                                                                                  |
| `--locale <l>`                | the article's locale; by default the file's name, which must then be two letters (`en.md`)                                                                             |
| `--published-at <iso>`        | the publication date, signed in unix seconds; now by default                                                                                                           |
| `--revision <n>`              | a positive integer; 1 by default                                                                                                                                       |
| `--prior-attestation <0x...>` | the [attestation digest](../concepts/signing-and-anchoring.md#the-attestation-digest) of the revision this one follows, as `sign` printed it; 32 zero bytes by default |
| `--skip-audit`                | signs even an article holding invisible or directional characters                                                                                                      |
| `--skip-stamp`                | writes no `.ots`                                                                                                                                                       |

The audit refuses before anything is signed, naming each character by line, column and code point on stdout. A missing title or slug, a file name that names no locale, a revision, a prior attestation or a date that is none, and a file that does not exist are each refused before the wallet is asked. The wallet's answer is verified against the content before `<name>.attestation.json` is written: a signature that does not recover to the address the wallet claims is refused, and nothing is written. A stamp no calendar answered fails after the attestation is written, which stays: to get its proof, run `sign` again with the same flags and the same `--published-at` (the wallet signs the same message, and the stamp is retried), or stamp its content digest with `stampDigest`.

## verify

`attestation verify <url|file> [flags]` verifies the signature of an article, then its Bitcoin date when a proof is there. The article is a local markdown file with its `<name>.attestation.json` beside it (and its `<name>.ots`, when present), or a published article's URL, read through its `proof.json`. A proof still pending its block passes; a content that is not what was signed, a signature that does not recover to its declared signer, and a proof that is none or whose blocks disagree fail. Naming no article, a file that does not exist, or one with no `<name>.attestation.json` beside it is refused.

| Flag                   | Means                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `--skip-ots`           | checks the signature alone                                                                    |
| `--explorer <esplora>` | looks the Bitcoin blocks up on this Esplora-compatible explorer instead of the public default |

## upgrade

`attestation upgrade <ots-file> ...` asks the calendars, for each calendar-only proof, for the Bitcoin attestation they now hold, and rewrites the file when one was attached; a proof already anchored, or whose calendars have nothing yet, is left untouched. Naming no file, or a file that does not exist, is refused before any proof is rewritten; a file that is no proof fails.

## Related

- [Signing and anchoring](../concepts/signing-and-anchoring.md): what each command computes.
