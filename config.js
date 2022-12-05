import * as log from "deno-std-log";

export const settings = {
  data: {
    pull: true,
    url: "https://query.wikidata.org/sparql?format=json&query=SELECT%20DISTINCT%20%3Fitem%20%3FitemLabel%20%3Flicense%20%3FlicenseLabel%0AWHERE%20%7B%20%0A%20%20%3Fitem%20wdt%3AP6104%20wd%3AQ56241615%20.%20%0A%20%20%3Fitem%20wdt%3AP31%20wd%3AQ13442814%20.%0A%20%20%3Fitem%20wdt%3AP275%20%3Flicense%20.%0A%20%20%3Flicense%20wdt%3AP31*%2Fwdt%3AP279*%20wd%3AQ30939938%20.%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22%5BAUTO_LANGUAGE%5D%2Cen%22.%20%7D%0A%7D%0AGROUP%20BY%20%3Fitem%20%3FitemLabel%20%3Flicense%20%3FlicenseLabel",
    items: null,
    read: true,
    file: "./corpus/entries.json",
  },
  processing: {
    initialOffset: 0,
    processingDelay: 500,
    batchSize: 20,
  },
};

export const logging = {
  // from: https://medium.com/deno-the-complete-reference/using-logger-in-deno-44c5b2372bf3#91df
  //define handlers
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG", {
      formatter: "{datetime} {levelName} {msg}",
    }),
    file: new log.handlers.RotatingFileHandler("INFO", {
      filename: "./logs/process.log",
      maxBytes: 15,
      maxBackupCount: 5,
      formatter: (rec) =>
        JSON.stringify({
          region: rec.loggerName,
          ts: rec.datetime,
          level: rec.levelName,
          data: rec.msg,
        }),
    }),
  },
  //assign handlers to loggers
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
    client: {
      level: "INFO",
      handlers: ["file"],
    },
  },
};

export const abstractSources = [
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
