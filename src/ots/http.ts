import { Buffer } from 'node:buffer';
import http from 'node:http';
import https from 'node:https';

export type HttpCall = {
    body?: Uint8Array;
    headers: Record<string, string>;
    maxBytes?: number;
    method: 'GET' | 'POST';
};

// value: how long a calendar or an explorer is given to answer, the same for each.
const TIMEOUT_MS = 10_000;

// invariant: requests go through node:http rather than fetch so the HTTPS_PROXY, HTTP_PROXY and NO_PROXY of the environment are honoured without a flag, as a consumer behind a proxy expects.
/** Sends one request and resolves with the body of a 2xx answer; anything else rejects. */
export async function send(url: string, call: HttpCall): Promise<Buffer> {
    const secure = new URL(url).protocol === 'https:';
    const { Agent, request } = secure ? https : http;
    const agent = new Agent({ proxyEnv: process.env });
    return await new Promise((resolve, reject) => {
        const outgoing = request(
            url,
            { agent, headers: call.headers, method: call.method, timeout: TIMEOUT_MS },
            (response) => {
                const chunks: Buffer[] = [];
                let length = 0;
                response.on('data', (chunk: Buffer) => {
                    length += chunk.length;
                    if (length > (call.maxBytes ?? Infinity)) {
                        outgoing.destroy(
                            new RangeError(`${url} answered more than ${call.maxBytes} bytes`),
                        );
                        return;
                    }
                    chunks.push(chunk);
                });
                response.on('end', () => {
                    const status = response.statusCode ?? 0;
                    if (Math.floor(status / 100) !== 2) {
                        reject(new Error(`${call.method} ${url}: HTTP ${status}`));
                        return;
                    }
                    resolve(Buffer.concat(chunks));
                });
            },
        );
        // Stryker disable ArithmeticOperator,BlockStatement,StringLiteral: a request that waits out its 10 s is a wait no offline spec spends
        outgoing.on('timeout', () => {
            outgoing.destroy(new Error(`${url} did not answer within ${TIMEOUT_MS / 1000} s`));
        });
        // Stryker restore all
        outgoing.on('error', reject);
        outgoing.end(call.body);
    });
}
