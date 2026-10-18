import { specification } from '@jterrazz/test';
import { dirname } from 'node:path';
import { afterAll } from 'vitest';

// invariant: the package is met as its consumers install it: each chain links `@jterrazz/attestation` packed, from its own spec file, where `packed()` finds the project.
export const { cleanup, cli } = await specification.cli('node', {
    defaults: { NO_COLOR: '1', TZ: 'UTC' },
});

afterAll(cleanup);

// invariant: whatever a chain opens is the stand-in its fixture lays at `bin/open`, first on PATH, and nothing else that opens a window is reachable: no /usr/bin, where macOS keeps `open`; on Linux the `open` package's bundled xdg-open hands the URL to $BROWSER.
export const HEADLESS = {
    BROWSER: '$WORKDIR/bin/open',
    DISPLAY: null,
    PATH: [
        '$WORKDIR/bin',
        dirname(process.execPath),
        '/bin',
        ...(process.platform === 'linux' ? ['/usr/bin'] : []),
    ].join(':'),
    XDG_CURRENT_DESKTOP: null,
};
