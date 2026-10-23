/** Refuses bytes that do not read as the OpenTimestamps format. */
export function malformed(): never {
    throw new TypeError('The bytes do not read as an OpenTimestamps timestamp.');
}

/** Reads the bytes of a proof in the order the OpenTimestamps format lays them, refusing bytes that run out. */
export class ProofReader {
    private readonly input: Uint8Array;
    private offset = 0;

    constructor(input: Uint8Array) {
        this.input = input;
    }

    atEnd(): boolean {
        return this.offset === this.input.length;
    }

    byte(): number {
        const value = this.input[this.offset];
        if (value === undefined) {
            malformed();
        }
        this.offset += 1;
        return value;
    }

    // invariant: a field read past the end leaves the reader past it, so `atEnd` and `byte` refuse what follows.
    bytes(length: number): Uint8Array {
        const value = this.input.slice(this.offset, this.offset + length);
        this.offset += length;
        return value;
    }

    varuint(): number {
        let value = 0;
        let scale = 1;
        let byte = 0;
        do {
            byte = this.byte();
            value += (byte % 128) * scale;
            scale *= 128;
        } while (byte >= 128);
        return value;
    }

    varbytes(maxLength: number, minLength = 0): Uint8Array {
        const length = this.varuint();
        if (length > maxLength || length < minLength) {
            malformed();
        }
        return this.bytes(length);
    }
}
