import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts";
import * as citationJS from "@citation-js/core";
import "@enkore/citationjs-plugin";
import { generateXML } from "./lib/xmlexporter.js";

const sleep = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));

async function getWikidataItem(entity) {
    const wdi = await new citationJS.Cite.async(entity);
    return wdi.data[0];
}
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

async function processItem({ wikidataItem, crossrefItem }) {
    const filename = `./corpus/processed/wikidata-${wikidataItem.id}.xml`;
    const xml = await generateXML({ wikidataItem, crossrefItem });
    await writeTXT(filename, xml);
}

async function updateEndpoint() {
    const url = `https://enkore.toolforge.org/api/corpus/update.php`;
    const response = await fetch(url, {
        method: "GET",
    });
    console.log({ response });
    const notificationresponse = await fetch(Deno.env.get("notification_url"), {
        method: "POST",
        body: message,
        headers: {
            Title: "Corpus Update",
            Priority: 3,
            Tags: "package",
        },
    });
    console.log({ notificationresponse });
}

async function main() {
    let entries;

    if (typeof Deno?.args?.[0] === "string") {
        const filename = Deno.args[0];
        entries = await readJSON(filename).catch((error) => {
            console.log(`ERROR: ${error}`);
            Deno.exit(1);
        });
    }

    const items = entries.results.bindings.map((x) => x.item.value);

    const size = 50;
    for (let offset = 0; offset < items.length; offset += size) {
        for (let i = offset; i < offset + size && items.length; i++) {
            if (i < items.length) {
                console.log({ offset, i });
                const wikidataItem = await getWikidataItem(items[i]);
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
}

main();
