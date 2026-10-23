/** Writes the fields of a proof in the order the OpenTimestamps format lays them. */
export class ProofWriter {
    private readonly chunks: number[] = [];

    byte(value: number): void {
        this.chunks.push(value);
    }

    bytes(value: Uint8Array): void {
        for (const byte of value) {
            this.chunks.push(byte);
        }
    }

    varuint(value: number): void {
        let rest = value;
        while (rest > 0x7f) {
            this.chunks.push(128 + (rest % 128));
            rest = Math.floor(rest / 128);
        }
        this.chunks.push(rest);
    }

    varbytes(value: Uint8Array): void {
        this.varuint(value.length);
        this.bytes(value);
    }

    output(): Uint8Array {
        return Uint8Array.from(this.chunks);
    }
}
