import { writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { hexToBytes } from 'viem';

import { buildAttestationMessage } from '../attestation/create.js';
import { attestationDigest } from '../attestation/digest.js';
import { stringify } from '../attestation/serialize.js';
import { verifyAttestation } from '../attestation/verify.js';
import { signViaBrowser } from '../eth/sign-flow.js';
import { stampDigest } from '../ots/stamp.js';
import { audit } from '../primitives/audit.js';
import type { AuditFinding } from '../primitives/audit.js';
import { canonicalize } from '../primitives/canonicalize.js';
import { checkmark, fmt } from './io.js';
import { readNamed, RefusalError } from './refusal.js';

export type SignArgs = {
    file: string;
    title: string;
    slug: string;
    locale?: string | undefined;
    publishedAt?: string | undefined;
    revision?: number | undefined;
    priorAttestation?: `0x${string}` | undefined;
    skipStamp?: boolean | undefined;
    skipAudit?: boolean | undefined;
};

/** Signs an article with the browser's wallet: `<name>.attestation.json` beside it, then its calendar-only `<name>.ots`. */
export async function runSign(args: SignArgs): Promise<void> {
    const locale = args.locale ?? localeOf(args.file);
    const bytes = await readNamed(args.file, {
        fix: 'name the markdown file of the article, from the directory you run in',
        read: 'sign',
        why: 'the signature is over the content of that file',
    });
    const content = bytes.toString('utf8');
    const canonical = canonicalize(content);
    process.stdout.write(`${checkmark()} Canonicalized ${canonical.length} bytes (${locale})\n`);

    if (args.skipAudit !== true) {
        refuseSuspicious(args.file, audit(canonical));
    }

    const message = buildAttestationMessage({
        content,
        locale,
        priorAttestation: args.priorAttestation,
        publishedAt: args.publishedAt === undefined ? new Date() : dateOf(args.publishedAt),
        revision: args.revision,
        slug: args.slug,
        title: args.title,
    });
    process.stdout.write(`${fmt.info('→')} Content digest: ${message.subject.contentDigest}\n`);
    process.stdout.write(`${fmt.info('→')} Opening browser to sign with your wallet…\n`);

    const signed = { ...message, ...(await signViaBrowser({ message })) };
    const verdict = await verifyAttestation({ attestation: signed, content });
    if (!verdict.ok) {
        throw new RefusalError({
            fix: 'sign again with the account the wallet shows; if it fails again, the wallet signed other data than the page served',
            found: `the wallet's signature does not verify (${verdict.error.kind})`,
            read: 'sign',
            why: 'an attestation that fails verification proves nothing, so none was written',
        });
    }
    process.stdout.write(`${checkmark()} Signed by ${fmt.bold(signed.signerAddress)}\n`);

    const stem = join(dirname(args.file), basename(args.file, extname(args.file)));
    await writeFile(`${stem}.attestation.json`, stringify(signed));
    process.stdout.write(`${checkmark()} Wrote ${stem}.attestation.json\n`);
    process.stdout.write(
        `${fmt.info('→')} Attestation digest (a next revision's --prior-attestation): ${attestationDigest(signed)}\n`,
    );

    if (args.skipStamp !== true) {
        process.stdout.write(`${fmt.info('→')} Submitting to OpenTimestamps calendars…\n`);
        const proof = await stampDigest(hexToBytes(message.subject.contentDigest));
        // Stryker disable StringLiteral: a proof some calendar answered is reached only with the live calendars — make test-network
        await writeFile(`${stem}.ots`, proof);
        process.stdout.write(
            `${checkmark()} Wrote ${stem}.ots (${proof.length} bytes, calendar-only)\n`,
        );
        process.stdout.write(
            `  ${fmt.dim('Run `attestation upgrade` in ~24h to anchor in Bitcoin.')}\n`,
        );
        // Stryker restore StringLiteral
    }
}

function refuseSuspicious(file: string, findings: AuditFinding[]): void {
    if (findings.length === 0) {
        return;
    }
    process.stdout.write(`${fmt.warn('!')} ${findings.length} suspicious char(s) found:\n`);
    for (const { codepoint, column, line, name } of findings) {
        process.stdout.write(
            `  line ${line}, col ${column}: U+${codepoint.toString(16).toUpperCase()} (${name})\n`,
        );
    }
    throw new RefusalError({
        fix: 'remove them from the article, or pass --skip-audit to sign it as it is',
        found: `${findings.length} invisible or directional character(s) in ${file}, listed above`,
        read: 'sign',
        why: 'they hide or reorder text, so a reader would not see what is signed',
    });
}

function localeOf(file: string): string {
    const name = basename(file, extname(file));
    if (/^[a-z]{2}$/u.test(name)) {
        return name;
    }
    throw new RefusalError({
        fix: 'pass the locale (--locale en), or name the file by it (en.md)',
        found: `the file name ${basename(file)} names no locale`,
        read: 'sign',
        why: 'the locale is signed, and without --locale it is read from a two-letter file name',
    });
}

function dateOf(iso: string): Date {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        throw new RefusalError({
            fix: 'give an ISO 8601 date: --published-at 2024-05-09T00:00:00Z',
            found: `--published-at ${iso} is no date`,
            read: 'sign',
            why: 'the publication date is signed, in unix seconds',
        });
    }
    return date;
}
