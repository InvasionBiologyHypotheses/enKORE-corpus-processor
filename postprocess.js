import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts";
import citationJS from "https://dev.jspm.io/@citation-js/core";
import "https://dev.jspm.io/@citation-js/plugin-wikidata";
import { generateXML } from "./lib/xmlexporter.js";

console.log(Deno.args);

const filename = Deno.args[0];
const json = await readJSON(filename);
// console.log({json})

const items = json.results.bindings.map((x) => x.item.value);
console.log({ items });

console.log("citation JS call start");
const size = 50;
// const remainder = items.length % size;
// const runs = (items.length - remainder) / size;
for (let offset = 0; offset < items.length; offset += size) {
    for (let i = offset; i < offset + size && items.length; i++) {
        if (i < items.length) {
            console.log({ offset, i });
            const result = await new citationJS.Cite.async(items[i]);
            await processItem(result.data[0]);
            // setTimeout(async () => {
            //     // console.log(items[i]);
            //     const result = await new citationJS.Cite.async(items[i]);
            //     // console.log({ result });
            //     await processItem(result.data[0]);
            // }, 10000);
        }
    }
    await sleep(1000);
}
console.log("citation JS call stop");

updateEndpoint();

// results.data.map(async (x) => await processItem(x));

async function sleep(time) {
    await setTimeout(async () => {
        console.log("sleeping");
        return null;
    }, time);
}

async function processItem(item) {
    console.log({ item });
    const filename = `./corpus/processed/wikidata-${item.id}.xml`;
    const xml = await generateXML(item);
    console.log(filename);
    console.log(xml);
    await writeTXT(filename, xml);
}

// for (let i = 0; i < items.length - 1; i++) {
//     console.log({ i });
//     processItem(items[i]);
// }
// items.map(async (item) => {
//     await setTimeout(, 500);
// });

async function updateEndpoint() {
    const url = `https://enkore.toolforge.org/api/corpus/update.php`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "text/plain",
        },
    });
    console.log({ response });
}
