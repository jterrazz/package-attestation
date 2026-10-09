/** The message of a thrown error, or the thrown value as text when it is no Error. */
export function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
