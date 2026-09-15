import { testing } from '@jterrazz/test/oxlint';
import { compose, defineConfig, library, type OxlintConfig } from '@jterrazz/typescript/oxlint';

/*
 * `testing` is declared with widened property types in @jterrazz/test 15
 * (`rules: { 'import/exports-last': string }` instead of oxlint's closed level
 * union), so it does not structurally satisfy `OxlintConfig` — the assertion
 * states what the fragment is until the type ships narrowed upstream.
 */
const config: OxlintConfig = defineConfig(compose(library, testing as OxlintConfig));

export default config;
