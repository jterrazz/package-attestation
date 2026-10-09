// invariant: the JSON lands inside a JavaScript template literal of an inline <script>, so a backslash, a backtick and a closing script tag are escaped — a payload can neither end the literal nor the script.
export function embeddedJson(json: string): string {
    return json
        .replaceAll('\\', String.raw`\\`)
        .replaceAll('`', '\\`')
        .replaceAll(/<\/script>/giu, String.raw`<\/script>`);
}
