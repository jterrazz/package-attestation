import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('ots', () => {
    test('a Bitcoin-anchored proof is verified on an explorer, and every proof that is not is told apart', async () => {
        // Given - a consumer holding a real anchored proof, an Esplora double for its three blocks, proofs built to fail, and every calendar behind a proxy that refuses
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/consumer/'))
            .fixture(directory('../__fixtures__/hardhat/'))
            .fixture(directory('../__fixtures__/signews/'))
            .env({
                HTTPS_PROXY: 'http://127.0.0.1:9',
                NO_PROXY: null,
                https_proxy: 'http://127.0.0.1:9',
                no_proxy: null,
            })
            .exec('ots.mjs');

        // Then - the earliest block's time, and one verdict per proof that is not anchored
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            stamp 0 bytes: Expected 32-byte SHA-256 digest, got 0 bytes
            stamp 31 bytes: Expected 32-byte SHA-256 digest, got 31 bytes
            stamp 33 bytes: Expected 32-byte SHA-256 digest, got 33 bytes
            Submitting to remote calendar https://a.pool.opentimestamps.org
            Submitting to remote calendar https://b.pool.opentimestamps.org
            Submitting to remote calendar https://a.pool.eternitywall.com
            Submitting to remote calendar https://ots.btc.catallaxy.com
            stamp 32 bytes: No OpenTimestamps calendar answered: the proof would attest nothing.
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948655 is valid
            Lite-client verification, assuming block hash-948647 is valid
            anchored, on the explorer: {"bitcoinBlockTime":"2026-05-09T14:51:40.000Z","ok":true}
            anchored, another digest: {"details":"File does not match original!","ok":false,"reason":"invalid-proof"}
            a short digest: {"details":"Expected 32-byte digest, got 31","ok":false,"reason":"digest-mismatch"}
            a short digest, on the explorer: {"details":"Expected 32-byte digest, got 31","ok":false,"reason":"digest-mismatch"}
            bytes that are no proof: {"details":"Not an OpenTimestamps proof: the bytes do not read as a detached timestamp file.","ok":false,"reason":"invalid-proof"}
            Ignoring attestation from calendar https://calendar.example.invalid: Calendar not in whitelist
            calendar-only: {"ok":false,"reason":"pending-bitcoin"}
            Ignoring attestation from calendar https://calendar.example.invalid: Calendar not in whitelist
            calendar-only, an empty explorer: {"ok":false,"reason":"pending-bitcoin"}
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948625 is valid
            Lite-client verification, assuming block hash-948655 is valid
            Lite-client verification, assuming block hash-948647 is valid
            anchored, a block that disagrees: {"details":"bitcoin verification failed: Digest does not match merkleroot","ok":false,"reason":"invalid-proof"}
            anchored, the explorer down: {"details":"bitcoin verification failed: Error: connect ECONNREFUSED 127.0.0.1:{{port}}","ok":false,"reason":"invalid-proof"}
            upgrading an anchored proof: {"length":5162,"same":true,"upgraded":false}
            Ignoring attestation from calendar https://calendar.example.invalid: Calendar not in whitelist
            upgrading against a calendar off the whitelist: {"same":true,"upgraded":false}
            upgrading bytes that are no proof: Not an OpenTimestamps proof: the bytes do not read as a detached timestamp file.
        `);
    });
});
