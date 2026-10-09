import { readFile, writeFile } from 'node:fs/promises';

import { upgradeProof } from '../ots/stamp.js';
import { checkmark, fmt } from './io.js';

export type UpgradeArgs = {
    files: string[];
};

export async function runUpgrade(args: UpgradeArgs): Promise<void> {
    if (args.files.length === 0) {
        throw new Error('No .ots files provided.');
    }

    for (const path of args.files) {
        process.stdout.write(`${fmt.info('→')} ${path}\n`);
        const { bytes, upgraded } = await upgradeProof(new Uint8Array(await readFile(path)));

        if (upgraded) {
            await writeFile(path, bytes);
            process.stdout.write(
                `  ${checkmark()} Upgraded to Bitcoin attestation (${bytes.length} bytes)\n`,
            );
        } else {
            process.stdout.write(
                `  ${fmt.dim('· No new attestation available yet, leaving file untouched.')}\n`,
            );
        }
    }
}
