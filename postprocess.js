import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts";
import * as citationJS from "@citation-js/core";
import "@enkore/citationjs-plugin";
import { generateXML } from "./lib/xmlexporter.js";
import { get } from "lodash";

const args = {
  startAtEntryIndex: {
    flag: "-s",
    description: "start from initial offset",
    parse: (argPos) => parseInt(Deno?.args?.[argPos + 1]) ?? 0,
  },
};

const abstractSources = [
  {
    name: "crossref",
    wikidataProperty: {
      id: "P356",
      label: "DOI",
    },
    url: (id) => `https://api.crossref.org/v1/works/${id}`,
    path: "message.abstract",
    format: "json",
  },
  {
    name: "pmc",
    wikidataProperty: {
      id: "P932",
      label: "PMCID",
    },
    url: (id) =>
      `https://www.ebi.ac.uk/europepmc/webservices/rest/article/PMC/PMC${id}?resultType=core&format=json`,
    path: "result.abstractText",
    format: "json",
  },
  {
    name: "pubmed",
    wikidataProperty: {
      id: "P698",
      label: "PMID",
    },
    url: (id) =>
      `https://www.ebi.ac.uk/europepmc/webservices/rest/article/MED/${id}?resultType=core&format=json`,
    path: "result.abstractText",
    format: "json",
  },
];
const sleep = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));

async function getAbstract(src, service) {
  const id = src[service.wikidataProperty.label];
  if (id == null) {
    return null;
  }
  // console.log({ id });
  const url = service.url(id);
  console.log({ url });
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  // console.log({ data });
  const out = get(data, service.path);
  // console.log({ out });
  return out;
}

async function findAbstract(wikidataItem) {
  for (const source of abstractSources) {
    const foundAbstract = await getAbstract(wikidataItem, source);
    if (foundAbstract) {
      console.log(`found abstract in ${source.name}`);
      return foundAbstract;
    }
  }
  return null;
}

async function getWikidataItem(entity) {
  const wdi = await new citationJS.Cite.async(entity);
  console.log(wdi.data[0]);
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

async function processItem({ wikidataItem, crossrefItem, accumulatedData }) {
  const filename = `./corpus/processed/wikidata-${wikidataItem.id}.xml`;
  const xml = await generateXML({
    wikidataItem,
    crossrefItem,
    accumulatedData,
  });
  return await writeTXT(filename, xml);
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
  console.log("starting main");
  let entries;

  if (typeof Deno?.args?.[0] === "string") {
    const filename = Deno.args[0];
    entries = await readJSON(filename).catch((error) => {
      console.log(`ERROR: ${error}`);
      Deno.exit(1);
    });
  }

  console.log(Deno.args);
  console.log(Deno?.args?.indexOf("-s"));
  const initOffset = parseInt(Deno?.args?.[Deno?.args?.indexOf("-s") + 1]) ?? 0;
  //  args["startAtEntryIndex"].parse(
  //   Deno?.args?.findIndex(args["startAtEntryIndex"].flag),
  // );
  console.log({ initOffset });

  const items = entries.results.bindings.map((x) => x.item.value);

  const size = 50;
  for (let offset = initOffset; offset < items.length; offset += size) {
    for (let i = offset; i < offset + size && items.length; i++) {
      if (i < items.length) {
        console.log({ offset, i });
        const wikidataItem = await getWikidataItem(items[i]);
        console.log("wikidataitem id: ", wikidataItem["id"]);
        let crossrefItem;
        if (wikidataItem.DOI) {
          crossrefItem = await getCrossrefItem(wikidataItem.DOI);
        }
        const accumulatedData = {
          abstract: await findAbstract(wikidataItem),
        };
        console.log({ accumulatedData });
        const process = await processItem({
          wikidataItem,
          crossrefItem,
          accumulatedData,
        });
        console.log({ process });
      }
    }
    await sleep(1000);
  }

  updateEndpoint();
}

main();
