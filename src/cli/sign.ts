import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { hexToBytes } from 'viem';

import { buildAttestationMessage } from '../attestation/create.js';
import { stringify } from '../attestation/serialize.js';
import { verifyAttestation } from '../attestation/verify.js';
import { signViaBrowser } from '../eth/sign-flow.js';
import { stampDigest } from '../ots/stamp.js';
import { audit } from '../primitives/audit.js';
import type { AuditFinding } from '../primitives/audit.js';
import { canonicalize } from '../primitives/canonicalize.js';
import { checkmark, fmt } from './io.js';

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
    const content = await readFile(args.file, 'utf8');
    const canonical = canonicalize(content);
    process.stdout.write(`${checkmark()} Canonicalized ${canonical.length} bytes (${locale})\n`);

    if (args.skipAudit !== true) {
        refuseSuspicious(audit(canonical));
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
        throw new Error(
            `The wallet's signature does not verify (${verdict.error.kind}): nothing was written.`,
        );
    }
    process.stdout.write(`${checkmark()} Signed by ${fmt.bold(signed.signerAddress)}\n`);

    const stem = join(dirname(args.file), basename(args.file, extname(args.file)));
    await writeFile(`${stem}.attestation.json`, stringify(signed));
    process.stdout.write(`${checkmark()} Wrote ${stem}.attestation.json\n`);

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

function refuseSuspicious(findings: AuditFinding[]): void {
    if (findings.length === 0) {
        return;
    }
    process.stdout.write(`${fmt.warn('!')} ${findings.length} suspicious char(s) found:\n`);
    for (const { codepoint, column, line, name } of findings) {
        process.stdout.write(
            `  line ${line}, col ${column}: U+${codepoint.toString(16).toUpperCase()} (${name})\n`,
        );
    }
    process.stdout.write('  Pass --skip-audit to sign anyway.\n');
    throw new Error('Audit failed: clean up suspicious characters first.');
}

function localeOf(file: string): string {
    const name = basename(file, extname(file));
    if (/^[a-z]{2}$/u.test(name)) {
        return name;
    }
    throw new Error(
        `Cannot derive locale from filename "${basename(file)}". Pass --locale explicitly.`,
    );
}

function dateOf(iso: string): Date {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        throw new TypeError(`--published-at must be a date, got ${iso}.`);
    }
    return date;
}
