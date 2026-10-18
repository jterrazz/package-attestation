import { writeFile } from 'node:fs/promises';

import { upgradeProof } from '../ots/stamp.js';
import { checkmark, fmt } from './io.js';
import { readNamed, RefusalError } from './refusal.js';

export type UpgradeArgs = {
    files: string[];
};

/** Asks the calendars, for each proof, for the Bitcoin attestation they now hold, and rewrites a proof one was attached to; every file is read before any is rewritten. */
export async function runUpgrade(args: UpgradeArgs): Promise<void> {
    if (args.files.length === 0) {
        throw new RefusalError({
            fix: 'name the proofs `sign` wrote: attestation upgrade en.ots',
            found: '`attestation upgrade` names no .ots file',
            read: 'upgrade',
            why: 'it upgrades the proofs it is given, and no other',
        });
    }

    const proofs = await Promise.all(
        args.files.map(async (path) => ({
            bytes: new Uint8Array(
                await readNamed(path, {
                    fix: 'name the .ots file `sign` wrote beside the article',
                    read: 'upgrade',
                    why: 'only an existing proof can be upgraded',
                }),
            ),
            path,
        })),
    );

    for (const proof of proofs) {
        process.stdout.write(`${fmt.info('·')} ${proof.path}\n`);
        const { bytes, upgraded } = await upgradeProof(proof.bytes);

        // Stryker disable ConditionalExpression,BlockStatement,StringLiteral: a proof the calendars upgrade is reached only with the live calendars (make test-network)
        if (upgraded) {
            await writeFile(proof.path, bytes);
            process.stdout.write(
                `  ${checkmark()} Upgraded to Bitcoin attestation (${bytes.length} bytes)\n`,
            );
            // Stryker restore all
        } else {
            process.stdout.write(
                `  ${fmt.dim('· No new attestation available yet, leaving file untouched.')}\n`,
            );
        }
    }
}
