import { hasShape } from '../primitives/shape.js';
import { send } from './http.js';

/** The public explorer a Bitcoin block is looked up on when the caller names none. */
export const PUBLIC_ESPLORA = 'https://blockstream.info/api';

export type BlockHeader = { merkleRoot: string; time: number };

type EsploraBlock = { merkle_root: string; timestamp: number };

function isEsploraBlock(value: unknown): value is EsploraBlock {
    return hasShape(value, { merkle_root: 'string', timestamp: 'number' });
}

/** Looks a block up on an Esplora-compatible explorer by its height, and says which block it trusts. */
export async function blockAt(explorer: string, height: number): Promise<BlockHeader> {
    try {
        const hash = await send(`${explorer}/block-height/${height}`, {
            headers: { Accept: 'text/plain' },
            method: 'GET',
        });
        process.stdout.write(
            `Lite-client verification, assuming block ${hash.toString()} is valid\n`,
        );
        const answer = await send(`${explorer}/block/${hash.toString()}`, {
            headers: { Accept: 'application/json' },
            method: 'GET',
        });
        const block: unknown = JSON.parse(answer.toString());
        if (!isEsploraBlock(block)) {
            throw new TypeError(
                `The explorer's block ${hash.toString()} carries no merkle_root and timestamp`,
            );
        }
        return { merkleRoot: block.merkle_root, time: block.timestamp };
    } catch (error) {
        // outside: the message a verdict carries names the error itself (`Error: connect ECONNREFUSED ...`), as the client this one replaced said it.
        // Stryker disable next-line ObjectLiteral: the cause is kept for whoever debugs the verdict, which reads only the message
        throw new Error(String(error), { cause: error });
    }
}
