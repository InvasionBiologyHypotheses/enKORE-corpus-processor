import { config } from "dotenv";
import { parse } from "deno-std-flags";
import * as retried from "retried";

import { readJSON, readJSONFromURL, writeJSON, writeTXT } from "flat-data";
import * as citationJS from "@citation-js/core";
import "@enkore/citationjs-plugin";
import { generateXML } from "./lib/xmlexporter.js";
import get from "just-safe-get";
import extend from "just-extend";
import * as log from "deno-std-log";

import { abstractSources, logging, settings } from "./config.js";

const sleep = (time = 1000) =>
  new Promise((resolve) => setTimeout(resolve, time));

async function processArgs(args) {
  const parsedArgs = parse(args, {
    string: ["entries", "filename"],
    alias: {
      pull: "p",
      url: "u",
      items: "i",
      read: "r",
      file: "f",
      offset: "o",
      size: "s",
      delay: "d",
    },
    default: {
      pull: settings?.data?.pull || true,
      url: settings?.data?.url || null,
      items: settings?.data?.items || null,
      read: settings?.data?.read || false,
      file: settings?.data?.file || null,
      offset: settings?.processing?.initialOffset || 0,
      size: settings?.processing?.batchSize || 50,
      delay: settings?.processing?.processingDelay || 1000,
    },
    boolean: ["pull", "read"],
    negatable: ["pull", "read"],
  });
  /* !! Can't mush entries together - object not array!
  Simplify first?
  */
  let entries = {};
  if (parsedArgs.pull) {
    dl.debug("Pull");
    const retrieved = await fetchURLEntries(parsedArgs.url);
    extend(entries, retrieved);
    if (parsedArgs.file) {
      await saveFileEntries(parsedArgs.file, retrieved);
    }
  } else {
    dl.debug("No pull");
    if (parsedArgs.read && parsedArgs.file) {
      dl.debug(`Fetching file: ${parsedArgs.file}`);
      const read = await fetchFileEntries(parsedArgs.file);
      extend(entries, read);
    }
  }
  let items = entries?.results?.bindings?.map((x) => x?.item?.value) || [];
  if (parsedArgs.items) {
    items = [...items, ...parsedArgs?.items?.split("|")];
  }
  dl.debug(`${items.length} items`);
  return { parsedArgs, items };
}

async function fetchURLEntries(url) {
  if (!url) {
    dl.error("No url to fetch! Exiting...");
    Deno.exit(1);
    return;
  }
  dl.debug(`Fetching entries from ${url}`);
  const entries = await readJSONFromURL(url);
  dl.debug(`Entries retrieved from url: ${entries?.results?.bindings?.length}`);
  return entries;
}

async function fetchFileEntries(file) {
  if (!file) return;
  const entries = await readJSON(file).catch((error) => {
    dl.error(`ERROR: ${error}`);
    Deno.exit(1);
  });
  dl.debug(`${entries.length} entries retrieved from file: ${file}`);
  return entries;
}

async function saveFileEntries(file, entries) {
  const fileSave = await writeJSON(file, entries, null, 2);
  dl.debug(`File written: ${file} - ${fileSave}`);
  return fileSave;
}

async function getAbstract(src, service) {
  const id = src[service.wikidataProperty.label];
  if (id == null) {
    return null;
  }
  const url = service.url(id);
  try {
    const res = await faultTolerantFetch(url);
    if (!res.ok) throw res.error;
    const data = await res.json();
    const out = get(data, service.path);
    return out;
  } catch (error) {
    dl.error(`Fetch error: ${error}`);
  }
}

async function findAbstract(wikidataItem) {
  for (const source of abstractSources) {
    const foundAbstract = await getAbstract(wikidataItem, source);
    if (foundAbstract) {
      return foundAbstract;
    }
  }
  return null;
}

function faultTolerantFetch(address) {
  dl.debug("entering faultTolerantFetch");
  return new Promise((resolve, reject) => {
    const operation = retried.operation({});
    operation.attempt(async (currentAttempt) => {
      try {
        resolve(await fetch(address));
        dl.debug("fetch succeeded");
        operation.succeed();
      } catch (error) {
        dl.error(`Attempt ${currentAttempt}, Error:`);
        dl.error(error);

        if (await operation.retry(error)) return;
        reject(error);
      }
    });
  });
}

async function getCrossrefItem(DOI) {
  try {
    const response = await faultTolerantFetch(
      `https://api.crossref.org/works/${encodeURIComponent(DOI)}`,
    );
    if (response.ok) {
      const data = await response.json();
      return data?.message;
    } else {
      dl.error(`CrossRef Fetch Failed: ${DOI}`);
      dl.error(response?.headers);
      throw response.error;
    }
  } catch (error) {
    dl.error(`Fetch Failed: ${error}`);
  }
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
    dl.debug(`wikidataitem id: ${item?.id}`);
    // dl.debug(JSON.stringify(item, null, 2));
    let crossrefItem = await getCrossrefItem(item.DOI);
    const accumulatedData = {
      abstract: await findAbstract(item),
    };
    const process = await processItem({
      wikidataItem: item,
      crossrefItem,
      accumulatedData,
    });
    await sleep(500);
  });
}

async function updateEndpoint() {
  const response = await fetch(Deno.env.get("UPDATE_URL"), {
    method: "GET",
  });
  dl.debug({ response });
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
  dl.debug({ notificationresponse });
}

async function main() {
  dl.debug("starting main");
  const startTime = new Date();

  const {
    parsedArgs: { offset, size, delay },
    items,
  } = await processArgs(Deno.args);

  if (items?.length < 1) {
    dl.info("No items to process - exiting.");
    Deno.exit(0);
  }

  // dl.debug(items);

  cl.info(`processor started at ${startTime}`);
  for (let count = offset; count < items.length; count += size) {
    const batch = items.slice(
      offset,
      offset + size > items.length ? items.length : offset + size,
    );
    cl.info(`Processing ${size} entries from ${count}`);
    dl.debug({ count });
    // dl.debug(batch);
    await getItemData(batch);
    dl.debug("start sleeping");
    await sleep(delay);
    dl.debug("stop sleeping");
  }
  const endTime = new Date();
  cl.info(`processor finished at ${endTime}`);
  cl.info(
    `processor took ${(endTime - startTime) / 6000} minutes for ${
      items.length
    } entries`,
  );

  // updateEndpoint();
}

await config();
await log.setup(logging);

const dl = log.getLogger();
const cl = log.getLogger("client");

if (import.meta.main) {
  main();
}
