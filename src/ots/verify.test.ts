import { describe, expect, test } from 'vitest';

import { verifyOts } from './verify.js';

describe('verifyOts — input validation', () => {
    test('rejects a non-32-byte digest', async () => {
        const result = await verifyOts(new Uint8Array(31), new Uint8Array(0));
        expect(result.ok).toBeFalsy();
        if (!result.ok) {
            expect(result.reason).toBe('digest-mismatch');
        }
    });

    test('rejects garbage proof bytes', async () => {
        const validDigest = new Uint8Array(32);
        const garbage = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
        const result = await verifyOts(validDigest, garbage);
        expect(result.ok).toBeFalsy();
        if (!result.ok) {
            expect(result.reason).toBe('invalid-proof');
        }
    });

    test('rejects a non-32-byte digest with an explorer option set', async () => {
        // The option must not change validation — refused before any lookup.
        const result = await verifyOts(new Uint8Array(31), new Uint8Array(0), {
            explorerUrl: 'http://127.0.0.1:9',
        });
        expect(result.ok).toBeFalsy();
        if (!result.ok) {
            expect(result.reason).toBe('digest-mismatch');
        }
    });

    test('rejects garbage proof bytes with an explorer option set', async () => {
        // Deserialization fails first, so the explorer is never contacted.
        const validDigest = new Uint8Array(32);
        const garbage = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
        const result = await verifyOts(validDigest, garbage, {
            explorerUrl: 'http://127.0.0.1:9',
        });
        expect(result.ok).toBeFalsy();
        if (!result.ok) {
            expect(result.reason).toBe('invalid-proof');
        }
    });
});
