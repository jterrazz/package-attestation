import { readFile } from 'node:fs/promises';

const REFERENCE = 'https://github.com/jterrazz/package-attestation/blob/main/docs/reference/cli.md';

export type Lesson = {
    found: string;
    why: string;
    fix: string;
    read: 'sign' | 'upgrade' | 'verify';
};

/** A user error the binary refuses: what it found, why that stops it, how to fix it, and the section of the CLI reference to read. */
export class RefusalError extends Error {
    constructor({ found, why, fix, read }: Lesson) {
        super(`found: ${found} · why: ${why} · fix: ${fix} · read: ${REFERENCE}#${read}`);
        // Stryker disable next-line StringLiteral: the binary prints the message alone, so the name is the class's, never read
        this.name = 'RefusalError';
    }
}

/** The bytes of a file the command line named, or a refusal saying it is not there. */
export async function readNamed(path: string, lesson: Omit<Lesson, 'found'>): Promise<Buffer> {
    try {
        return await readFile(path);
    } catch (error) {
        // Stryker disable next-line ConditionalExpression,LogicalOperator: readFile rejects only with an Error carrying a code, so the first two tests only narrow its type
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            throw new RefusalError({ ...lesson, found: `no file ${path}` });
        }
        throw error;
    }
}
