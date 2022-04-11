import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts";
import citationJS from "https://dev.jspm.io/@citation-js/core";
import "https://dev.jspm.io/@citation-js/plugin-wikidata";
import { generateXML } from "./lib/xmlexporter.js";

const filename = Deno.args[0];
const json = await readJSON(filename);

await runProcessor(
    json.results.bindings.map((x) => x.item.value),
    50,
    1000,
).catch((error) => console.log(error));
await updateEndpoint();
await sendNotification();

async function runProcessor(items, batchSize = 50, sleepTime = 1000) {
    return new Promise(async (resolve) => {
        // for (let offset = 0; offset < items.length; offset += batchSize) {
        for (let i = 0; i < items.length; i++) {
            // if (i < items.length) {
            console.log({ i });
            const wdi = await new citationJS.Cite.async(items[i]);
            const wikidataItem = wdi.data[0];
            let crossrefItem;
            if (wikidataItem.DOI) {
                crossrefItem = await getCrossrefItem(wikidataItem.DOI);
            }
            await processItem({ wikidataItem, crossrefItem });
            // }
        }
        // await sleep(sleepTime);
        // }
        resolve();
    });
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

// async function sleep(time) {
//     return new Promise((resolve) => setTimeout(resolve, time));
// }

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
    if (response.ok) {
        return true;
    }
}
async function sendNotification(options) {
    const defaultOptions = {
        method: "POST",
        body: JSON.stringify(response, null, 2),
        headers: {
            Title: "Corpus Update",
            Priority: 3,
            Tags: "package",
        },
    };
    const notificationresponse = await fetch(
        Deno.env.get("notification_url"),
        options ?? defaultOptions,
    );
    console.log({ notificationresponse });
}
