import type { AttestationMessage } from '../primitives/eip712-schema.js';
import { NOT_FOUND, serveOnLoopback } from './loopback.js';
import type { Answer } from './loopback.js';
import { buildSignPageHtml } from './sign-page-html.js';
import { typedDataOf, walletSignatureOf } from './typed-data.js';
import type { WalletSignature } from './typed-data.js';

export type SignFlowOptions = {
    message: AttestationMessage;
    /** Receives the page's URL; opens it in the default browser by default. */
    onUrlReady?: (url: string) => Promise<void> | void;
    /** Default 5 minutes. */
    timeoutMs?: number;
};

export type SignFlowResult = WalletSignature;

/** The flow with its opener named: it never defaults to the visible browser itself. */
export type OpenedSignFlow = SignFlowOptions & {
    onUrlReady: (url: string) => Promise<void> | void;
};

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/** `signViaBrowser` with its opener named, which `./browser.ts` alone hands the default browser. */
export async function serveSignFlow(opts: OpenedSignFlow): Promise<SignFlowResult> {
    const html = buildSignPageHtml(JSON.stringify(typedDataOf(opts.message)));
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return await serveOnLoopback<SignFlowResult>({
        answer: (method, path, body): Answer<SignFlowResult> => {
            if (method === 'GET' && (path === '/' || path === '/index.html')) {
                return { body: html, contentType: 'text/html; charset=utf-8', status: 200 };
            }
            if (method === 'POST' && path === '/done') {
                return answerSignature(body);
            }
            return NOT_FOUND;
        },
        onUrlReady: opts.onUrlReady,
        timeoutMessage: `Sign flow timed out after ${timeoutMs}ms`,
        timeoutMs,
    });
}

function answerSignature(body: string): Answer<SignFlowResult> {
    let posted: unknown;
    try {
        posted = JSON.parse(body);
    } catch {
        return { body: 'Parse error', status: 400 };
    }
    const signature = walletSignatureOf(posted);
    if (signature === null) {
        return { body: 'Invalid payload', status: 400 };
    }
    return { body: 'OK', settled: { value: signature }, status: 200 };
}
