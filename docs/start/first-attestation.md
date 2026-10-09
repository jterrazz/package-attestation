# The first attestation

From an article on disk to a signature anyone can check and a Bitcoin date, with the `attestation` binary: sign, stamp, upgrade, verify. Each command's every flag is [the CLI reference](../reference/cli.md); what each step computes is [Signing and anchoring](../concepts/signing-and-anchoring.md).

## 1. Sign

Name the article's file by its locale — `en.md` — and sign it:

```bash
npx @jterrazz/attestation sign en.md --title "Hello" --slug hello
```

The binary canonicalizes the file, refuses invisible or directional characters it finds, and opens your browser on a page served on 127.0.0.1: your wallet (`window.ethereum`) shows the typed data and signs it. The signature is checked against the content before anything is written, then the binary writes `en.attestation.json` beside the article and prints its attestation digest — keep it: it is the `--prior-attestation` of the next revision.

## 2. Stamp

Unless `--skip-stamp` is given, `sign` goes on to submit the content digest to the OpenTimestamps calendars and writes `en.ots`, a proof that is calendar-only for now. If no calendar answers, the attestation stays written and `en.ots` is not: sign again later with the same flags and the same `--published-at`, and the same message is signed and stamped.

## 3. Upgrade

About a day later, the calendars have committed the digest to a Bitcoin block:

```bash
npx @jterrazz/attestation upgrade en.ots
```

The proof is rewritten with its Bitcoin attestation, or left untouched while the block is still to come.

## 4. Verify

```bash
npx @jterrazz/attestation verify en.md
```

The signature is recovered offline, then the date is read from the block the proof names; a proof still pending its block passes. Publish `en.md`, `en.attestation.json`, `en.ots` and a `proof.json` naming them beside the article, and anyone verifies it from its URL — `attestation verify <url>`, or `verifyFromUrl` in a page.
