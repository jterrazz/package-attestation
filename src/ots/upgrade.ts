import { messageOf } from '../primitives/error-message.js';
import { sameAttestation } from './attestation.js';
import { isWhitelisted, timestampFrom } from './calendar.js';
import { attestationsOf, attestedNodesOf, isComplete, merge } from './timestamp.js';
import type { Timestamp } from './timestamp.js';

/** Asks each whitelisted calendar a proof is still pending on for what it now holds, merges each answer in, and says whether one brought an attestation the proof lacked. */
export async function upgradeTimestamp(
    root: Timestamp,
    ask: (calendar: string, commitment: Uint8Array) => Promise<Timestamp> = timestampFrom,
): Promise<boolean> {
    const known = attestationsOf(root).map(({ attestation }) => attestation);
    const asked: Promise<Timestamp | undefined>[] = [];
    for (const node of attestedNodesOf(root)) {
        if (isComplete(node)) {
            continue;
        }
        for (const attestation of node.attestations) {
            if (attestation.kind !== 'pending') {
                continue;
            }
            if (!isWhitelisted(attestation.uri)) {
                process.stdout.write(
                    `Ignoring attestation from calendar ${attestation.uri}: Calendar not in whitelist\n`,
                );
                continue;
            }
            asked.push(answerOf(attestation.uri, node, ask));
        }
    }
    const answers = await Promise.all(asked);
    const fresh = answers.some(
        (answer) =>
            answer !== undefined &&
            attestationsOf(answer).some(
                ({ attestation }) => !known.some((had) => sameAttestation(had, attestation)),
            ),
    );
    return fresh;
}

async function answerOf(
    calendar: string,
    node: Timestamp,
    ask: (calendar: string, commitment: Uint8Array) => Promise<Timestamp>,
): Promise<Timestamp | undefined> {
    try {
        const answer = await ask(calendar, node.message);
        process.stdout.write(
            `Got ${attestationsOf(answer).length} attestation(s) from ${calendar}\n`,
        );
        merge(node, answer);
        return answer;
    } catch (error) {
        process.stdout.write(`Calendar ${calendar}: ${messageOf(error)}\n`);
        return undefined;
    }
}
