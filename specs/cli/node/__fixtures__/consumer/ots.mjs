import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { stampDigest, upgradeProof, verifyOts } from '@jterrazz/attestation/node';
import OpenTimestamps from 'javascript-opentimestamps';

import { print } from './wallet.mjs';

const hex = (text) => Uint8Array.from(Buffer.from(text, 'hex'));
const anchored = new Uint8Array(readFileSync('en.ots'));
const digest = hex(JSON.parse(readFileSync('en.attestation.json', 'utf8')).subject.contentDigest.slice(2));

// The Esplora double: the three blocks the proof is anchored in, each with the merkle root the proof computes for it.
const BLOCKS = {
    948625: { merkle: '8e542cdc20de8e372317dfecb19881385fb2e0ccc1e562ed8794cf7128345f6b', time: 1_778_338_300 },
    948647: { merkle: '4ad55ffb9bb6e9de5d55b207640919035f975da00962235b3a10adc148dd63a3', time: 1_778_350_000 },
    948655: { merkle: '95baa8d64c277bec255273a0fe9ac542e64b61fef1851899386127b1c867cba3', time: 1_778_355_000 },
};
let tamperedMerkle = false;
const explorer = createServer((request, response) => {
    const [, kind, key] = request.url.split('/');
    if (kind === 'block-height' && key in BLOCKS) {
        response.end(`hash-${key}`);
        return;
    }
    const block = BLOCKS[key?.replace('hash-', '')];
    if (kind === 'block' && block !== undefined) {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ merkle_root: tamperedMerkle ? '00'.repeat(32) : block.merkle, timestamp: block.time }));
        return;
    }
    response.statusCode = 404;
    response.end();
});
await new Promise((listening) => explorer.listen(0, '127.0.0.1', listening));
const explorerUrl = `http://127.0.0.1:${explorer.address().port}`;

const pending = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), digest);
pending.timestamp.attestations.push(new OpenTimestamps.Notary.PendingAttestation('https://calendar.example.invalid'));
const calendarOnly = new Uint8Array(pending.serializeToBytes());

for (const length of [0, 31, 33, 32]) {
    await stampDigest(new Uint8Array(length)).then(
        () => process.stdout.write(`stamp ${length} bytes: stamped\n`),
        (error) => process.stdout.write(`stamp ${length} bytes: ${error.message}\n`),
    );
}

print('anchored, on the explorer', await verifyOts(digest, anchored, { explorerUrl }));
print('anchored, another digest', await verifyOts(new Uint8Array(32), anchored, { explorerUrl }));
print('a short digest', await verifyOts(new Uint8Array(31), anchored));
print('a short digest, on the explorer', await verifyOts(new Uint8Array(31), anchored, { explorerUrl }));
print('bytes that are no proof', await verifyOts(digest, hex('deadbeef'), { explorerUrl }));
print('calendar-only', await verifyOts(digest, calendarOnly));
print('calendar-only, an empty explorer', await verifyOts(digest, calendarOnly, { explorerUrl: '' }));
tamperedMerkle = true;
print('anchored, a block that disagrees', await verifyOts(digest, anchored, { explorerUrl }));
explorer.close();
print('anchored, the explorer down', await verifyOts(digest, anchored, { explorerUrl }));

const complete = await upgradeProof(anchored);
print('upgrading an anchored proof', { length: complete.bytes.length, same: Buffer.from(complete.bytes).equals(Buffer.from(anchored)), upgraded: complete.upgraded });
const stillPending = await upgradeProof(calendarOnly);
print('upgrading against a calendar off the whitelist', { same: Buffer.from(stillPending.bytes).equals(Buffer.from(calendarOnly)), upgraded: stillPending.upgraded });
await upgradeProof(hex('deadbeef')).then(
    () => process.stdout.write('upgrading bytes that are no proof: upgraded\n'),
    (error) => process.stdout.write(`upgrading bytes that are no proof: ${error.message}\n`),
);
