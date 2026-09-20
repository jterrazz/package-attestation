import { specification } from '@jterrazz/test';
import { afterAll } from 'vitest';

/**
 * The runner every spec of this package stands on.
 *
 * No `services`: nothing here talks to a database or a cache. What earns the
 * folder is the other half of the facet — the GOLDEN. The v1 byte contracts
 * under `_expected/` are what every published attestation is verified
 * against, so they are specified, not unit-tested.
 */
export const { cleanup, integration } = await specification.integration();

afterAll(cleanup);
