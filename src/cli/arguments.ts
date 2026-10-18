import { RefusalError } from './refusal.js';

export type CommandName = 'sign' | 'upgrade' | 'verify';

export type Surface = {
    usage: string;
    /** Each flag it has, true when the flag takes a value. */
    flags: Readonly<Record<string, boolean>>;
    /** The one operand it reads; a command without one reads a list. */
    operand?: string;
};

export type Line = {
    operands: string[];
    values: Map<string, string>;
    switches: Set<string>;
};

type Reading = Line & { name: CommandName; surface: Surface };

const HELP: ReadonlySet<string> = new Set(['--help', '-h']);

/** Reads one command's arguments against its surface: null when they ask for its usage, else its operands, values and switches; a flag it does not have, a flag given twice, a value missing or given to a switch, and one operand too many are refused. */
export function readLine(name: CommandName, surface: Surface, args: string[]): Line | null {
    const end = args.indexOf('--');
    const own = end === -1 ? args : args.slice(0, end);
    if (own.some((argument) => HELP.has(argument))) {
        return null;
    }
    const reading: Reading = {
        name,
        operands: [],
        surface,
        switches: new Set(),
        values: new Map(),
    };
    let index = 0;
    while (index < own.length) {
        index += readOne(reading, own[index] ?? '', own[index + 1]);
    }
    reading.operands.push(...(end === -1 ? [] : args.slice(end + 1)));
    refuseExcess(reading);
    return { operands: reading.operands, switches: reading.switches, values: reading.values };
}

function readOne(reading: Reading, argument: string, next: string | undefined): number {
    if (!argument.startsWith('-') || argument === '-') {
        reading.operands.push(argument);
        return 1;
    }
    const equals = argument.indexOf('=');
    const spelled = equals === -1 ? argument : argument.slice(0, equals);
    const inline = equals === -1 ? undefined : argument.slice(equals + 1);
    const flag = spelled.slice(2);
    const takesValue = spelled.startsWith('--') ? reading.surface.flags[flag] : undefined;
    if (takesValue === undefined) {
        throw refusal(reading, {
            fix: `drop it; the usage is ${reading.surface.usage}`,
            found: `\`attestation ${reading.name}\` has no flag ${spelled}`,
            why: 'a flag the command does not have is a typo or meant for another command, and the run would not be the one asked for',
        });
    }
    if (reading.switches.has(flag) || reading.values.has(flag)) {
        throw refusal(reading, {
            fix: `give ${spelled} once`,
            found: `${spelled} is given more than once`,
            why: 'the command reads it once, and a second value would silently replace the first',
        });
    }
    return takesValue
        ? readValue(reading, spelled, inline ?? next, inline === undefined ? 2 : 1)
        : readSwitch(reading, spelled, inline);
}

function readSwitch(reading: Reading, spelled: string, inline: string | undefined): number {
    if (inline !== undefined) {
        throw refusal(reading, {
            fix: `write it ${spelled}, alone`,
            found: `${spelled} takes no value`,
            why: 'a value the command does not read would be ignored, and the run would not be the one asked for',
        });
    }
    reading.switches.add(spelled.slice(2));
    return 1;
}

function readValue(
    reading: Reading,
    spelled: string,
    value: string | undefined,
    taken: number,
): number {
    if (value === undefined || value.startsWith('--')) {
        throw refusal(reading, {
            fix: `write it ${spelled} <value>, or ${spelled}=<value> for a value that starts with --`,
            found: `${spelled} has no value`,
            why: 'a flag read without its value would run the command on another value than the one meant',
        });
    }
    reading.values.set(spelled.slice(2), value);
    return taken;
}

function refuseExcess(reading: Reading): void {
    const { operand } = reading.surface;
    const excess = reading.operands[1];
    if (operand !== undefined && excess !== undefined) {
        throw refusal(reading, {
            fix: `name one ${operand} per run`,
            found: `\`attestation ${reading.name}\` was given ${excess}, a second ${operand}`,
            why: 'the command reads one, and the others would be silently ignored',
        });
    }
}

function refusal(
    reading: Reading,
    lesson: { found: string; why: string; fix: string },
): RefusalError {
    return new RefusalError({ ...lesson, read: reading.name });
}
