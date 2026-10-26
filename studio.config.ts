import { test } from '@jterrazz/test/config';
import { defineConfig } from '@jterrazz/typescript/config';

export default defineConfig({
    kind: 'library',
    platform: 'node',
    presets: [test()],
    test: {
        projects: {
            integration: {
                exclude:
                    (process.env.ATTEST_E2E_NETWORK ?? '') === ''
                        ? ['specs/integration/network/**']
                        : [],
                reason: 'the network specs reach the live OpenTimestamps calendars, which a run turns on with ATTEST_E2E_NETWORK',
            },
        },
    },
});
