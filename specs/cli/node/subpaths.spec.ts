import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('subpaths', () => {
    test('every target the manifest publishes is in the install, and loads under its condition', async () => {
        // Given - a consumer's project with the tarball installed
        const result = await cli
            .link('@jterrazz/attestation', packed())
            .fixture(directory('./__fixtures__/consumer/'))
            .exec('subpaths.mjs');

        // Then - each subpath answers its import and its require with the names it publishes, and the bin is a node script
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            @jterrazz/attestation (require) → ./dist/index.cjs: ATTESTATION_DOMAIN_V1, ATTESTATION_PRIMARY_TYPE, ATTESTATION_TYPES_V1, CANONICAL_VERSION, InvalidContentError, NO_PRIOR_ATTESTATION, SCHEMA_VERSION, attestationDigest, audit, buildAttestationMessage, canonicalize, createAttestation, fromStored, parse, signAttestation, stringify, toStored, verifyAttestation
            @jterrazz/attestation (import) → ./dist/index.js: ATTESTATION_DOMAIN_V1, ATTESTATION_PRIMARY_TYPE, ATTESTATION_TYPES_V1, CANONICAL_VERSION, InvalidContentError, NO_PRIOR_ATTESTATION, SCHEMA_VERSION, attestationDigest, audit, buildAttestationMessage, canonicalize, createAttestation, fromStored, parse, signAttestation, stringify, toStored, verifyAttestation
            @jterrazz/attestation/browser (require) → ./dist/browser.cjs: ATTESTATION_DOMAIN_V1, ATTESTATION_PRIMARY_TYPE, ATTESTATION_TYPES_V1, InvalidContentError, NO_PRIOR_ATTESTATION, attestationDigest, buildAttestationMessage, canonicalize, fromStored, parse, resolveEnsName, sha256Hex, stringify, toStored, verifyAttestation, verifyFromUrl
            @jterrazz/attestation/browser (import) → ./dist/browser.js: ATTESTATION_DOMAIN_V1, ATTESTATION_PRIMARY_TYPE, ATTESTATION_TYPES_V1, InvalidContentError, NO_PRIOR_ATTESTATION, attestationDigest, buildAttestationMessage, canonicalize, fromStored, parse, resolveEnsName, sha256Hex, stringify, toStored, verifyAttestation, verifyFromUrl
            @jterrazz/attestation/node (require) → ./dist/node.cjs: signBatchViaBrowser, signViaBrowser, stampDigest, upgradeProof, verifyOts
            @jterrazz/attestation/node (import) → ./dist/node.js: signBatchViaBrowser, signViaBrowser, stampDigest, upgradeProof, verifyOts
            bin attestation → ./dist/attestation.js: #!/usr/bin/env node
            files: dist
        `);
    });
});
