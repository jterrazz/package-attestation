import { setTimeout as delay } from 'node:timers/promises';

import { hasShape } from '../primitives/shape.js';
import { send } from './http.js';

/** The public explorer a Bitcoin block is looked up on when the caller names none. */
export const PUBLIC_ESPLORA = 'https://blockstream.info/api';

// value: the pause before a lookup the explorer did not answer is asked once more.
const RETRY_AFTER_MS = 500;

export type BlockHeader = { merkleRoot: string; time: number };

type EsploraBlock = { merkle_root: string; timestamp: number };

/** The explorer could not say what a block holds: unreachable, refusing, or answering what no block is. It says nothing of the proof. */
export class ExplorerUnreachableError extends Error {
    // Stryker disable next-line StringLiteral: no verdict reads the class's name, only its message
    override readonly name = 'ExplorerUnreachableError';
}

function isEsploraBlock(value: unknown): value is EsploraBlock {
    return hasShape(value, { merkle_root: 'string', timestamp: 'number' });
}

function jsonOf(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

async function asked(url: string, accept: string): Promise<string> {
    const call = { headers: { Accept: accept }, method: 'GET' } as const;
    // Stryker disable BlockStatement: the pause before the second ask shows only as time, which no spec measures
    try {
        const answer = await send(url, call);
        return answer.toString();
    } catch {
        await delay(RETRY_AFTER_MS);
    }
    // Stryker restore BlockStatement
    try {
        const answer = await send(url, call);
        return answer.toString();
    } catch (error) {
        // Stryker disable next-line ObjectLiteral: the cause is kept for whoever debugs the verdict, which reads only the message
        throw new ExplorerUnreachableError(error instanceof Error ? error.message : String(error), {
            cause: error,
        });
    }
}

/** Looks a block up on an Esplora-compatible explorer by its height, asking twice before it gives up, and says which block it trusts. */
export async function blockAt(explorer: string, height: number): Promise<BlockHeader> {
    const hash = await asked(`${explorer}/block-height/${height}`, 'text/plain');
    process.stdout.write(`Lite-client verification, assuming block ${hash} is valid\n`);
    const block = jsonOf(await asked(`${explorer}/block/${hash}`, 'application/json'));
    if (!isEsploraBlock(block)) {
        throw new ExplorerUnreachableError(
            `The explorer's block ${hash} carries no merkle_root and timestamp`,
        );
    }
    return { merkleRoot: block.merkle_root, time: block.timestamp };
}
