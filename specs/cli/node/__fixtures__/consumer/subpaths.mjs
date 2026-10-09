import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const installed = join('node_modules', '@jterrazz', 'attestation');
const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
const require = createRequire(join(process.cwd(), 'package.json'));

for (const [subpath, conditions] of Object.entries(manifest.exports)) {
    const specifier = join('@jterrazz/attestation', subpath);
    for (const [condition, target] of Object.entries(conditions)) {
        const loaded = condition === 'require' ? require(specifier) : await import(specifier);
        const names = Object.keys(loaded).toSorted().join(', ');
        process.stdout.write(`${specifier} (${condition}) → ${target}: ${existsSync(join(installed, target)) ? names : 'missing'}\n`);
    }
}
for (const [name, target] of Object.entries(manifest.bin)) {
    process.stdout.write(`bin ${name} → ${target}: ${readFileSync(join(installed, target), 'utf8').split('\n')[0]}\n`);
}
process.stdout.write(`files: ${manifest.files.join(', ')}\n`);
