import { specification } from '@jterrazz/test';
import { afterAll } from 'vitest';

// invariant: the package is met as its consumers install it: each chain links `@jterrazz/attestation` packed, from its own spec file, where `packed()` finds the project.
export const { cleanup, cli } = await specification.cli('node', {
    defaults: { NO_COLOR: '1', TZ: 'UTC' },
});

afterAll(cleanup);
