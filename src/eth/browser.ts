import { serveBatchSignFlow } from './sign-batch-flow.js';
import type { BatchSignFlowOptions, BatchSignFlowResult } from './sign-batch-flow.js';
import { serveSignFlow } from './sign-flow.js';
import type { SignFlowOptions, SignFlowResult } from './sign-flow.js';

// invariant: the one module that reaches the default browser: the flows take their opener as an argument, and only these two hand the real one over, so no flow mutant can open a window on its own.

/** Opens the URL in the default browser. */
export async function openInBrowser(url: string): Promise<void> {
    const { default: open } = await import('open');
    await open(url);
}

// Stryker disable LogicalOperator: `&&` hands the real browser a consumer's page in place of the opener it named, a visible window no check may open

/** Serves a page on 127.0.0.1 that asks the browser's wallet to sign the message, and resolves with the signature it posts back to `/done`; a malformed post is answered 400 and the page may retry. */
export async function signViaBrowser(opts: SignFlowOptions): Promise<SignFlowResult> {
    return await serveSignFlow({ ...opts, onUrlReady: opts.onUrlReady ?? openInBrowser });
}

/** Serves a page on 127.0.0.1 that walks the entries through the browser's wallet one by one: each signature is posted to `/sig`, each refusal to `/skip`, and `/done` resolves with both. */
export async function signBatchViaBrowser(
    opts: BatchSignFlowOptions,
): Promise<BatchSignFlowResult> {
    return await serveBatchSignFlow({ ...opts, onUrlReady: opts.onUrlReady ?? openInBrowser });
}

// Stryker restore LogicalOperator
