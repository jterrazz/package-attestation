/**
 * Demo: signs one article with the Hardhat test wallet (NO browser, NO MetaMask)
 * and writes en.attestation.json next to en.md.
 *
 * Run from packages/attestation:
 *   npx tsx scripts/demo-sign.ts <article-folder> <slug>
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';

import { createAttestation } from '../src/attestation/create.js';
import { stringify } from '../src/attestation/serialize.js';

/**
 * Hardhat default mnemonic, account[0] — the most public private key in the
 * Ethereum ecosystem, and never a key that holds value. The suites sign with
 * the same wallet through `src/attestation/wallet.fixtures.ts`, which a demo
 * may not import: a fixtures module is reachable from `*.test.ts` only (F5).
 */
const DEMO_PRIVATE_KEY =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

const [folder, slug] = process.argv.slice(2);
if (folder === undefined || folder === '' || slug === undefined || slug === '') {
    throw new Error('Usage: tsx scripts/demo-sign.ts <article-folder> <slug>');
}

const contentDir = join(process.cwd(), '..', '..', 'content', folder);

// Only sign the English source. The badge / verify page show this single
// Attestation on every locale of the article.
const content = await readFile(join(contentDir, 'en.md'), 'utf8');
const account = privateKeyToAccount(DEMO_PRIVATE_KEY);
const signed = await createAttestation(
    {
        content,
        locale: 'en',
        publishedAt: new Date('2025-05-09T00:00:00Z'),
        slug,
        title: folder,
    },
    account,
);

await writeFile(join(contentDir, 'en.attestation.json'), stringify(signed), 'utf8');
process.stdout.write(`✓ Wrote ${folder}/en.attestation.json\n`);
