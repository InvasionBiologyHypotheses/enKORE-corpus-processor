import "https://deno.land/x/dotenv/load.ts";

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

const sources = [
  {
    name: "crossref",
    id: {
      type: "wikidataProperty",
      id: "P356",
      label: "DOI",
    },
    url: (id) => `https://api.crossref.org/v1/works/${id}`,
    format: "json",
    paths: {
      abstract: {
        path: "message.abstract",
      },
      license: {
        path: "message.license[0].URL",
      },
    },
  },
  {
    name: "pmc",
    id: {
      type: "wikidataProperty",
      id: "P932",
      label: "PMCID",
    },
    url: (id) =>
      `https://www.ebi.ac.uk/europepmc/webservices/rest/article/PMC/PMC${id}?resultType=core&format=json`,
    format: "json",
    paths: {
      abstract: {
        path: "result.abstractText",
      },
      license: {
        path: "result.license",
      },
    },
  },
  {
    name: "pubmed",
    id: {
      type: "wikidataProperty",
      id: "P698",
      label: "PMID",
    },
    url: (id) =>
      `https://www.ebi.ac.uk/europepmc/webservices/rest/article/MED/${id}?resultType=core&format=json`,
    format: "json",
    paths: {
      abstract: {
        path: "result.abstractText",
      },
      license: {
        path: "result.license",
      },
    },
  },
];

const sleep = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));

async function getAbstract({ id, url, path }) {
  if (id == null) {
    return null;
  }
  // console.log({ id });
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const out = get(data, path);
  // console.log({ out });
  return out;
}

async function findAbstract(wikidataItem) {
  for (const source of sources) {
    const foundAbstract = await getAbstract({
      id: wikidataItem[source.id.label],
      url: source.url,
      path: source.paths.abstract.path,
    });
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

async function updateEndpoint({ url }) {
  if (!url) return null;
  const response = await fetch(url, {
    method: "GET",
  });
  return await response.text();
}

async function notify({ url, message, title, tags }) {
  return await fetch(url, {
    method: "POST",
    body: message,
    headers: {
      Title: title,
      Priority: 3,
      Tags: tags,
    },
  });
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
  const initOffset =
    Deno?.args?.indexOf("-s") < 0
      ? 0
      : parseInt(Deno?.args?.[Deno?.args?.indexOf("-s") + 1]);
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

  const corpusUpdate = await updateEndpoint({
    url: Deno.env.get("UPDATE_URL"),
  });
  if (corpusUpdate && corpusUpdate != "Already up to date.")
    notify({
      url: Deno.env.get("NOTIFICATION_URL"),
      title: "Corpus Update",
      message: corpusUpdate,
      tags: "",
    });
}

main();
