import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts";
import * as citationJS from "@citation-js/core";
// import "@enkore/citationjs-plugin";
import { generateXML } from "./lib/xmlexporter.js";

if (typeof Deno?.args?.[0] === "string") {
    const filename = Deno.args[0];
    const json = await readJSON(filename).catch((error) => {
        console.log(`ERROR: ${error}`);
        Deno.exit(1);
    });

    await runProcessor(
        json.results.bindings.map((x) => x.item.value),
        50,
        1000,
    ).catch((error) => {
        console.log(`ERROR: ${error}`);
        Deno.exit(1);
    });
    const updateRes = await updateEndpoint();
    const notificationRes = await sendNotification(updateRes);
    console.log({ notificationRes });
} else {
    console.error(
        `Filename not passed to postprocessor.js as first argument - ${Deno?.args?.[0]}`,
    );
    Deno.exit(1);
}

async function runProcessor(items) {
    return new Promise(async (resolve) => {
        for (let i = 0; i < items.length; i++) {
            console.log({ i });
            const wdi = await new citationJS.Cite.async(items[i]);
            const wikidataItem = wdi.data[0];
            let crossrefItem;
            if (wikidataItem.DOI) {
                crossrefItem = await getCrossrefItem(wikidataItem.DOI);
            }
            await processItem({ wikidataItem, crossrefItem });
        }
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
    if (response.ok) {
        return await response.text();
    }
}
async function sendNotification(message = "Update Completed", options) {
    const defaultOptions = {
        method: "POST",
        body: message,
        headers: {
            Title: "Corpus Update",
            Priority: 3,
            Tags: "package",
        },
    };
    const response = await fetch(
        Deno.env.get("notification_url"),
        options ?? defaultOptions,
    );
    return await response.text();
}
