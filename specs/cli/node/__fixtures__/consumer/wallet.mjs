export { hardhatAccount as wallet } from './hardhat.mjs';

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
