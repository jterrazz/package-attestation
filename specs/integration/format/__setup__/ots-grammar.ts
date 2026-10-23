// value: the `.ots` grammar written by hand, so the bytes under test owe nothing to the code that reads them.
export const MAGIC = '004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294';
export const HEADER = `${MAGIC} 01 08 ${'00'.repeat(32)}`;
export const ALICE = 'https://alice.btc.calendar.opentimestamps.org';
export const BOB = 'https://bob.btc.calendar.opentimestamps.org';

export function varuint(value: number): string {
    const bytes: number[] = [];
    let rest = value;
    while (rest > 127) {
        bytes.push(128 + (rest % 128));
        rest = Math.floor(rest / 128);
    }
    bytes.push(rest);
    return Buffer.from(bytes).toString('hex');
}

export function varbytes(hex: string): string {
    return `${varuint(hex.length / 2)}${hex}`;
}

export function ascii(text: string): string {
    return Buffer.from(text).toString('hex');
}

export function pendingOn(uri: string): string {
    return `00 83dfe30d2ef90c8e ${varbytes(varbytes(ascii(uri)))}`;
}

export function bitcoin(height: number): string {
    return `00 0588960d73d71901 ${varbytes(varuint(height))}`;
}

export function bytesOf(hex: string): Buffer {
    return Buffer.from(hex.replaceAll(' ', ''), 'hex');
}
