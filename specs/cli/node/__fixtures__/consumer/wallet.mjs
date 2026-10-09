import { privateKeyToAccount } from 'viem/accounts';

// Hardhat's default account 0, the most public private key there is: it signs for the specs and holds no value.
export const wallet = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

export const article = {
    content: '# Hello\n\nWorld.',
    locale: 'en',
    publishedAt: new Date('2026-05-09T00:00:00Z'),
    slug: 'hello-world',
    title: 'Hello World',
};

export function print(label, value) {
    const json = JSON.stringify(value, (_, inner) => (typeof inner === 'bigint' ? `${inner}n` : inner));
    process.stdout.write(`${label}: ${json}\n`);
}
