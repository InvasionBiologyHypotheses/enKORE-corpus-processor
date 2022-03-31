import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts";
import citationJS from "https://dev.jspm.io/@citation-js/core";
import "https://dev.jspm.io/@citation-js/plugin-wikidata";
import { generateXML } from "./lib/xmlexporter.js";

const filename = Deno.args[0];
const json = await readJSON(filename);

const items = json.results.bindings.map((x) => x.item.value);

const size = 50;
for (let offset = 0; offset < items.length; offset += size) {
    for (let i = offset; i < offset + size && items.length; i++) {
        if (i < items.length) {
            console.log({ offset, i });
            const wdi = await new citationJS.Cite.async(items[i]);
            const wikidataItem = wdi.data[0];
            let crossrefItem;
            if (wikidataItem.DOI) {
                crossrefItem = await getCrossrefItem(wikidataItem.DOI);
            }
            await processItem({ wikidataItem, crossrefItem });
        }
    }
    await sleep(1000);
}

updateEndpoint();

async function getCrossrefItem(DOI) {
    let crossrefItem;
    const crossrefRes = await fetch(
        `https://api.crossref.org/works/${encodeURIComponent(DOI)}`,
    );
    if (crossrefRes.ok) {
        crossrefItem = (await crossrefRes.json()).message;
    }
    return crossrefItem;
}

async function sleep(time) {
    await setTimeout(async () => {
        console.log("sleeping");
        return null;
    }, time);
}

async function processItem({ wikidataItem, crossrefItem }) {
    const filename = `./corpus/processed/wikidata-${wikidataItem.id}.xml`;
    const xml = await generateXML({ wikidataItem, crossrefItem });
    await writeTXT(filename, xml);
}

async function updateEndpoint() {
    const url = `https://enkore.toolforge.org/api/corpus/update.php`;
    const response = await fetch(url, {
        method: "GET",
        // headers: {
        //     "Content-Type": "text/plain",
        // },
    });
    console.log({ response });
    const notificationresponse = await fetch(Deno.env.get("notification_url"), {
        method: "POST",
        body: JSON.stringify(response, null, 2),
        headers: {
            Title: "Corpus Update",
            Priority: 3,
            Tags: "package",
        },
    });
    console.log({ notificationresponse });
}
