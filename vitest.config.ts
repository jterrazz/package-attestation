import { defineSpecConfig, integration, unit } from '@jterrazz/test/vitest';
import type { ViteUserConfig } from 'vitest/config';

/**
 * Two projects: module tests beside the modules they cover, and the
 * integration specs under `specs/integration/`.
 *
 * The live OpenTimestamps suite is an OPTION of the integration project, not
 * a project of its own — it reaches a real calendar, so its folder is
 * collected only when ATTEST_E2E_NETWORK is set.
 */
const networkSuiteEnabled = (process.env.ATTEST_E2E_NETWORK ?? '') !== '';

const config: ViteUserConfig = defineSpecConfig({
    test: {
        projects: [
            unit(),
            integration({
                exclude: networkSuiteEnabled ? [] : ['specs/integration/network/**'],
            }),
        ],
    },
});

export default config;
