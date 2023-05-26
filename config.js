// ###########################################
// ##### Import required modules (START) #####
// ###########################################
import * as log from "deno-std-log";
// #########################################
// ##### Import required modules (END) #####
// #########################################


// ##############################################################
// ##### Information for console debugging purposes (START) #####
// ##############################################################
const filename_this = "Log(config.js): ";
console.log(filename_this + "Started reading commands from this script for processing!");

export const settings = {

  data: {

    pull: true,
    url: "https://query.wikidata.org/sparql?format=json&query=SELECT%20DISTINCT%20%3Fitem%20%3FitemLabel%20%3Flicense%20%3FlicenseLabel%20%3Ftopic%20%3FtopicLabel%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP6104%20wd%3AQ56241615%3B%0A%20%20%20%20%20%20%20%20wdt%3AP356%20%3Fdoi%20%3B%0A%20%20%20%20%20%20%20%20wdt%3AP921%20%3Ftopic%20.%0A%20%0A%20%20%7B%3Ftopic%20wdt%3AP31%20wd%3AQ41719%20.%7D%0A%20%20UNION%0A%20%20%7BVALUES%20%3Ftopic%20%7B%20wd%3AQ109467185%20wd%3AQ112148709%20wd%3AQ111525751%20wd%3AQ113019190%7D%20%7D%0A%20%20UNION%0A%20%20%7B%3Fitem%20wdt%3AP275%20%3Flicense%20.%0A%20%20%3Flicense%20wdt%3AP31*%2Fwdt%3AP279*%20wd%3AQ30939938%20.%7D%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22%5BAUTO_LANGUAGE%5D%2Cen%22.%20%7D%0A%7D%0AGROUP%20BY%20%3Fitem%20%3FitemLabel%20%3Flicense%20%3FlicenseLabel%20%3Ftopic%20%3FtopicLabel",
    // ##### Note: Adjustments in Wikidata can be made with:
    // ##### Note: https://query.wikidata.org/#SELECT%20DISTINCT%20%3Fitem%20%3FitemLabel%20%3Flicense%20%3FlicenseLabel%20%3Ftopic%20%3FtopicLabel%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP6104%20wd%3AQ56241615%3B%0A%20%20%20%20%20%20%20%20wdt%3AP356%20%3Fdoi%20%3B%0A%20%20%20%20%20%20%20%20wdt%3AP921%20%3Ftopic%20.%0A%20%0A%20%20%7B%3Ftopic%20wdt%3AP31%20wd%3AQ41719%20.%7D%0A%20%20UNION%0A%20%20%7BVALUES%20%3Ftopic%20%7B%20wd%3AQ109467185%20wd%3AQ112148709%20wd%3AQ111525751%20wd%3AQ113019190%7D%20%7D%0A%20%20UNION%0A%20%20%7B%3Fitem%20wdt%3AP275%20%3Flicense%20.%0A%20%20%3Flicense%20wdt%3AP31*%2Fwdt%3AP279*%20wd%3AQ30939938%20.%7D%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22%5BAUTO_LANGUAGE%5D%2Cen%22.%20%7D%0A%7D%0AGROUP%20BY%20%3Fitem%20%3FitemLabel%20%3Flicense%20%3FlicenseLabel%20%3Ftopic%20%3FtopicLabel
    items: null,
    read: true,
    // ##### Note: if filename to save entries.json is not provided inside (deno.jsonc), then 
    // the code will consider the name given below.
    file: "./corpus/entries_log2.json", // ##### Note: filename to save entries, if not provided inside (deno.jsonc)

  },

  processing: {

    initialOffset: 0, // ##### Note: Initial offset to start extraction process
    processingDelay: 500, // ##### Note: resting time between batches (in milliseconds)
    batchSize: 1, // ##### Note: quantity of consecutive wikidataItem-URL-extraction without resting

  },

};

export const logging = {

  // ##### Note: from: https://medium.com/deno-the-complete-reference/using-logger-in-deno-44c5b2372bf3#91df
  // ##### Note: define handlers

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

  // ##### Note: assign handlers to loggers
  loggers: {

    default: {

      level: "DEBUG", // ##### Note: Pre-fix for process.js (terminal display)
      handlers: ["console"],

    },

    client: {

      level: "INFO",
      handlers: ["file"],

    },

  },

};
// ############################################################
// ##### Information for console debugging purposes (END) #####
// ############################################################

// ########################################################
// ##### sources of API's to collect Abstract (START) #####
// ########################################################
export const abstractSources = [

  {

    name: "crossref", // ##### Note: CrossRef

    wikidataProperty: {

      id: "P356", // ##### Note: Property number in Wikidata
      label: "DOI",

    },

    url: (id) => `https://api.crossref.org/v1/works/${id}`,
    path: "message.abstract",
    format: "json",

  },

  {

    name: "pmc", // ##### Note: PubMedCentral

    wikidataProperty: {

      id: "P932", // ##### Note: Property number in Wikidata
      label: "PMCID",

    },

    url: (id) =>
      `https://www.ebi.ac.uk/europepmc/webservices/rest/article/PMC/PMC${id}?resultType=core&format=json`,
    path: "result.abstractText",
    format: "json",

  },

  {

    name: "pubmed", // ##### Note: PubMed

    wikidataProperty: {

      id: "P698", // ##### Note: Property number in Wikidata
      label: "PMID",

    },

    url: (id) =>
      `https://www.ebi.ac.uk/europepmc/webservices/rest/article/MED/${id}?resultType=core&format=json`,
    path: "result.abstractText",
    format: "json",

  },

];

console.log(filename_this + "Finished reading commands from this script for processing!");
// ######################################################
// ##### sources of API's to collect Abstract (END) #####
// ######################################################