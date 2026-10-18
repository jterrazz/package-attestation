import { once } from 'node:events';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** What the server answers a request; `settled` ends the flow with its value once the answer is sent. */
export type Answer<Value> = {
    status: number;
    body: string;
    contentType?: string;
    settled?: { value: Value };
};

type Answering<Value> = (method: string, path: string, body: string) => Answer<Value>;

export type LoopbackOptions<Value> = {
    answer: Answering<Value>;
    onUrlReady: (url: string) => Promise<void> | void;
    timeoutMs: number;
    timeoutMessage: string;
};

export const NOT_FOUND = { body: 'Not found', status: 404 } as const;

/** Serves one flow on a free port of 127.0.0.1 alone, hands its URL to `onUrlReady`, and settles with the first answer that settles it, or rejects when the time runs out, the server fails, or `onUrlReady` throws. */
export async function serveOnLoopback<Value>(options: LoopbackOptions<Value>): Promise<Value> {
    const { promise, reject, resolve } = Promise.withResolvers<Value>();
    const server = createServer((request, response) => {
        void respond(request, response, options.answer, (value) => {
            stop();
            resolve(value);
        });
    });
    const timer = setTimeout(() => {
        stop();
        reject(new Error(options.timeoutMessage));
    }, options.timeoutMs);
    const stop = (): void => {
        clearTimeout(timer);
        server.close();
    };
    const fail = (error: unknown): void => {
        stop();
        reject(error instanceof Error ? error : new Error(String(error)));
    };
    // Stryker disable next-line StringLiteral,CallExpression: a server listening on a free port never errors in a run
    server.on('error', fail);

    // Stryker disable next-line StringLiteral: bound to loopback alone, the page is unreachable from the network, which no test on this machine sees
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    // Stryker disable next-line ConditionalExpression,LogicalOperator,EqualityOperator,StringLiteral: a server listening on a TCP port always answers it as an object
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    void announce(options.onUrlReady, `http://127.0.0.1:${port}/`, fail);
    return await promise;
}

async function respond<Value>(
    request: IncomingMessage,
    response: ServerResponse,
    answer: Answering<Value>,
    settle: (value: Value) => void,
): Promise<void> {
    let body = '';
    for await (const chunk of request) {
        body += String(chunk);
    }
    // Stryker disable next-line StringLiteral: Node sets both on every request a server receives; the types call them optional
    const reply = answer(request.method ?? '', request.url ?? '', body);
    response.writeHead(reply.status, { 'content-type': reply.contentType ?? 'text/plain' });
    response.end(reply.body);
    if (reply.settled !== undefined) {
        const { value } = reply.settled;
        response.on('finish', () => {
            settle(value);
        });
    }
}

async function announce(
    onUrlReady: (url: string) => Promise<void> | void,
    url: string,
    fail: (error: unknown) => void,
): Promise<void> {
    try {
        await onUrlReady(url);
    } catch (error) {
        fail(error);
    }
}
