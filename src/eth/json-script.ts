// invariant: the JSON is served as the text of a <script type="application/json">, which the page reads with JSON.parse and never runs; `<` is written as its JSON escape, so a payload can neither close the element nor open a comment in it, and nothing in it is interpolated.
export function jsonScript(id: string, json: string): string {
    return `<script type="application/json" id="${id}">${json.replaceAll('<', String.raw`\u003c`)}</script>`;
}
