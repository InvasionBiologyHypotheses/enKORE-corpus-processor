import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts";
import { get } from "./lib/xmlexporter.js";

console.log(Deno.args);

const filename = Deno.args[0];
const json = await readJSON(filename);
// console.log({json})

const items = json.results.bindings.map((x) => x.item.value);
console.log({ items });

items.map(async (item) => {
    const filename = `./corpus/processed/wikidata-${item.substring(
        item.lastIndexOf("/") + 1,
    )}.xml`;
    const xml = await get(item);
    console.log(filename);
    console.log(xml);
    await writeTXT(filename, xml);
});
