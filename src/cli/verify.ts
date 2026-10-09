import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { hexToBytes } from 'viem';

import { parse } from '../attestation/serialize.js';
import { verifyAttestation } from '../attestation/verify.js';
import type { VerifyError } from '../attestation/verify.js';
import { fetchManifest, fetchOk, manifestUrlOf } from '../browser/proof.js';
import { verifyOts } from '../ots/verify.js';
import { checkmark, crossmark, fmt } from './io.js';
import { readNamed } from './refusal.js';

export type VerifyArgs = {
    /** An article's URL, or the path of its markdown file. */
    target: string;
    /** Checks the signature alone. */
    skipOts?: boolean | undefined;
    /** The Esplora-compatible explorer the Bitcoin block is looked up on. */
    explorerUrl?: string | undefined;
};

type Sources = {
    content: string;
    attestationJson: string;
    otsBytes: null | Uint8Array;
};

/** Verifies an article's signature, then its Bitcoin date when a proof sits beside it; a proof still pending its block passes. */
export async function runVerify(args: VerifyArgs): Promise<boolean> {
    const sources = /^https?:\/\//u.test(args.target)
        ? await loadFromUrl(args.target)
        : await loadFromFile(args.target);

    const attestation = parse(sources.attestationJson);
    const signature = await verifyAttestation({ attestation, content: sources.content });
    if (!signature.ok) {
        printSignatureFailure(signature.error);
        return false;
    }
    process.stdout.write(`${checkmark()} Content digest matches signature\n`);
    process.stdout.write(
        `${checkmark()} Signature valid — signed by ${fmt.bold(signature.signerAddress)}\n`,
    );

    if (args.skipOts === true || sources.otsBytes === null) {
        process.stdout.write(`${fmt.dim('· OTS verification skipped')}\n`);
        return true;
    }

    const date = await verifyOts(hexToBytes(attestation.subject.contentDigest), sources.otsBytes, {
        explorerUrl: args.explorerUrl,
    });
    if (date.ok) {
        process.stdout.write(
            `${checkmark()} Bitcoin timestamp confirmed at ${date.bitcoinBlockTime.toISOString()}\n`,
        );
        return true;
    }
    const details = date.details === undefined ? '' : ` — ${date.details}`;
    process.stdout.write(`${crossmark()} OTS: ${date.reason}${details}\n`);
    return date.reason === 'pending-bitcoin';
}

async function loadFromFile(path: string): Promise<Sources> {
    const stem = join(dirname(path), basename(path, extname(path)));
    const content = await readNamed(path, {
        fix: "name the article's markdown file, or its URL",
        read: 'verify',
        why: 'the signature is checked against the content of that file',
    });
    const attestationJson = await readNamed(`${stem}.attestation.json`, {
        fix: `sign the article first (attestation sign ${path} …), or verify its URL`,
        read: 'verify',
        why: 'the signature is read from the attestation `sign` writes beside the article',
    });
    const otsBytes = await readFile(`${stem}.ots`).then(
        (bytes) => new Uint8Array(bytes),
        () => null,
    );
    return {
        attestationJson: attestationJson.toString('utf8'),
        content: content.toString('utf8'),
        otsBytes,
    };
}

async function loadFromUrl(articleUrl: string): Promise<Sources> {
    const manifestUrl = manifestUrlOf(articleUrl);
    const manifest = await fetchManifest(fetch, manifestUrl);
    const [content, attestationJson, otsBytes] = await Promise.all([
        fetchOk(fetch, new URL(manifest.content, manifestUrl).toString()).then(
            async (response) => await response.text(),
        ),
        fetchOk(fetch, new URL(manifest.attestation, manifestUrl).toString()).then(
            async (response) => await response.text(),
        ),
        fetchOk(fetch, new URL(manifest.ots, manifestUrl).toString()).then(
            async (response) => new Uint8Array(await response.arrayBuffer()),
            () => null,
        ),
    ]);
    return { attestationJson, content, otsBytes };
}

function printSignatureFailure(error: VerifyError): void {
    process.stdout.write(`${crossmark()} ${fmt.fail('Verification failed')}: ${error.kind}\n`);
    for (const [key, value] of Object.entries(error)) {
        if (key !== 'kind') {
            process.stdout.write(`  ${key}: ${String(value)}\n`);
        }
    }
}
