import type { AttestationMessage } from '../primitives/eip712-schema.js';
import { isRecord } from '../primitives/shape.js';
import { openInBrowser } from './browser.js';
import { NOT_FOUND, serveOnLoopback } from './loopback.js';
import type { Answer } from './loopback.js';
import { buildBatchSignPageHtml } from './sign-batch-page-html.js';
import { typedDataOf, walletSignatureOf } from './typed-data.js';
import type { WalletSignature } from './typed-data.js';

export type BatchSignEntry = {
    /** The key a signature comes back under. */
    id: string;
    /** What the page shows for the entry. */
    label: string;
    message: AttestationMessage;
};

export type BatchSignFlowOptions = {
    entries: BatchSignEntry[];
    /** Receives the page's URL; opens it in the default browser by default. */
    onUrlReady?: (url: string) => Promise<void> | void;
    /** The whole session's; default 30 minutes. */
    timeoutMs?: number;
};

export type BatchSignature = WalletSignature;

export type BatchSignFlowResult = {
    signatures: Map<string, BatchSignature>;
    /** The entries skipped or refused by the wallet, each with its reason. */
    skipped: Map<string, string>;
};

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

const OK = { body: 'OK', status: 200 } as const;
const INVALID = { body: 'Invalid payload', status: 400 } as const;

/** Serves a page on 127.0.0.1 that walks the entries through the browser's wallet one by one: each signature is posted to `/sig`, each refusal to `/skip`, and `/done` resolves with both. */
export async function signBatchViaBrowser(
    opts: BatchSignFlowOptions,
): Promise<BatchSignFlowResult> {
    const html = buildBatchSignPageHtml(
        opts.entries.map(({ id, label, message }) => ({
            id,
            label,
            typedData: typedDataOf(message),
        })),
    );
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const result: BatchSignFlowResult = { signatures: new Map(), skipped: new Map() };

    return await serveOnLoopback<BatchSignFlowResult>({
        answer: (method, path, body): Answer<BatchSignFlowResult> => {
            if (method === 'GET' && (path === '/' || path === '/index.html')) {
                return { body: html, contentType: 'text/html; charset=utf-8', status: 200 };
            }
            if (method !== 'POST') {
                return NOT_FOUND;
            }
            if (path === '/done') {
                return { ...OK, settled: { value: result } };
            }
            if (path === '/sig' || path === '/skip') {
                return record(result, path, body);
            }
            return NOT_FOUND;
        },
        onUrlReady: opts.onUrlReady ?? openInBrowser,
        timeoutMessage: `Batch sign flow timed out after ${timeoutMs}ms`,
        timeoutMs,
    });
}

function record(result: BatchSignFlowResult, path: '/sig' | '/skip', body: string): Answer<never> {
    let posted: unknown;
    try {
        posted = JSON.parse(body);
    } catch {
        return { body: 'Parse error', status: 400 };
    }
    if (!isRecord(posted) || typeof posted.id !== 'string') {
        return INVALID;
    }
    if (path === '/skip') {
        result.skipped.set(
            posted.id,
            typeof posted.reason === 'string' ? posted.reason : 'skipped',
        );
        return OK;
    }
    const signature = walletSignatureOf(posted);
    if (signature === null) {
        return INVALID;
    }
    result.signatures.set(posted.id, signature);
    return OK;
}
