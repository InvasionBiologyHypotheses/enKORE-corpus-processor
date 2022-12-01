import "https://deno.land/x/dotenv/load.ts";
import { parse } from "https://deno.land/std@0.166.0/flags/mod.ts";

import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts";
import * as citationJS from "@citation-js/core";
import "@enkore/citationjs-plugin";
import { generateXML } from "./lib/xmlexporter.js";
import get from "just-safe-get";

import { abstractSources, settings } from "./config.js";

const sleep = (time = 1000) =>
  new Promise((resolve) => setTimeout(resolve, time));

async function processArgs(args) {
  const parsedArgs = parse(args, {
    string: ["entries", "filename"],
    alias: {
      entries: "e",
      file: "f",
      offset: "o",
      size: "s",
      delay: "d",
    },
    default: {
      entries: null,
      filename: null,
      offset: settings?.processing?.initialOffset || 0,
      size: settings?.processing?.batchSize || 50,
      delay: settings?.processing?.processingDelay || 1000,
    },
  });

  let items = [];
  if (parsedArgs.e) {
    items = [...items, ...parsedArgs.entries.split("|")];
  }
  if (parsedArgs.f) {
    const entries = await readJSON(parsedArgs.f).catch((error) => {
      console.error(`ERROR: ${error}`);
      Deno.exit(1);
    });
    items = [...items, ...entries.results.bindings.map((x) => x.item.value)];
  }
  return { parsedArgs, items };
}

async function getAbstract(src, service) {
  const id = src[service.wikidataProperty.label];
  if (id == null) {
    return null;
  }
  // console.log({ id });
  const url = service.url(id);
  // console.log({ url });
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
      // console.log(`found abstract in ${source.name}`);
      return foundAbstract;
    }
  }
  return null;
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

async function getItemData(items) {
  const { data } = await new citationJS.Cite.async(items);
  data.forEach(async (item) => {
    console.log("wikidataitem id: ", item["id"]);
    console.log({ item });
    let crossrefItem = await getCrossrefItem(item.DOI);
    const accumulatedData = {
      abstract: await findAbstract(item),
    };
    // console.log({ accumulatedData });
    const process = await processItem({
      wikidataItem: item,
      crossrefItem,
      accumulatedData,
    });
    // console.log({ process });
  });
}

async function updateEndpoint() {
  const response = await fetch(Deno.env.get("UPDATE_URL"), {
    method: "GET",
  });
  console.log({ response });
  const message = await response.text();
  const notificationresponse = await fetch(Deno.env.get("NOTIFICATION_URL"), {
    method: "POST",
    body: message || "no response!",
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

  const {
    parsedArgs: { offset, size, delay },
    items,
  } = await processArgs(Deno.args);

  for (let count = offset; count < items.length; count += size) {
    // for (let i = offset; i < offset + size && items.length; i++) {
    //   if (i < items.length) {
    //     console.log({ offset, i });
    //     getItemData(items[i]);
    //   }
    // }S
    const batch = items.slice(
      offset,
      offset + size > items.length ? items.length : offset + size,
    );
    console.log({ count });
    console.log(batch);
    await getItemData(batch);
    console.log("start sleeping");
    await sleep(delay);
    console.log("stop sleeping");
  }

  // updateEndpoint();
}

main();
