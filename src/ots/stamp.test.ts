import { describe, expect, test } from 'vitest';

import { stampDigest } from './stamp.js';

describe('stampDigest — input validation', () => {
    test('rejects a non-32-byte digest', async () => {
        await expect(stampDigest(new Uint8Array(31))).rejects.toThrow(/32-byte/u);
        await expect(stampDigest(new Uint8Array(33))).rejects.toThrow(/32-byte/u);
        await expect(stampDigest(new Uint8Array(0))).rejects.toThrow(/32-byte/u);
    });
});
