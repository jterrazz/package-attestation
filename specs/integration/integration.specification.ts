import { specification } from '@jterrazz/test';
import { afterAll } from 'vitest';

// invariant: no services. What earns these specs their folder is the frozen v1 goldens every published attestation is verified against.
export const { cleanup, integration } = await specification.integration();

afterAll(cleanup);
