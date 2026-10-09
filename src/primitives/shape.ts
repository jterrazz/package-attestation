/** What a JSON value must hold: a type, an optional string, or an object of named members. */
export type Shape = 'number' | 'string' | 'string?' | { readonly [member: string]: Shape };

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function hasShape(value: unknown, shape: Shape): boolean {
    if (shape === 'string?') {
        return value === undefined || typeof value === 'string';
    }
    if (typeof shape === 'string') {
        return typeof value === shape;
    }
    return (
        isRecord(value) &&
        Object.entries(shape).every(([member, inner]) => hasShape(value[member], inner))
    );
}
