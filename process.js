// ##### ==============================================================================
// ##### This script is the main conductor for the branch (enKORE-corpus-processor-main)
// ##### This branch is under the umbrella of enKORE-project
// ##### As the main outcome, XML files are generated for publications sourced from a
// ##### a SPARQL submitted to Wikidata
// ##### ==============================================================================
// ##### Comment about meta and source of input data
// ##### Name: process.js
// ##### Purpose: Create a corpus for the EndPoint source BASE (https://www.base-search.net/about/en/about_sources_data.php)
// ##### Author: Steph et al. (https://github.com/bootsa)
// ##### Version: unknown and in progress
// ##### Version-date: 00/00/0000
// ##### Additional comments: This conductor manages other scripts collecting information from three main sources, listed as:
// ##### (1) Wikidata, (2) CrossRef, (3) PubMed, and (4) PubMedCentral
// ##### Additional comments: This code is currently running in Toolforge, but implementations mostly locally.
// ##### Additional comments: N/A
// ##### ==============================================================================
// ##### Comment about the main functions
// ##### (1) The code starts with main(), which will then call processArgs() to process initial information;
// ##### (2) processArgs() will read process settings such as batchsize, sleepingtime, delays and so on;
// ##### (3) processArgs() will make use of fetchURLEntries() and saveFileEntries(), or of fetchFileEntries() to obtain entries.json (or other filename);
// ##### (4) After using processArgs(), main() will call getItemData() to run remaining functions for other tasks (e.g. get meta from Wikidata, Abstracts from CrossRef, PubMed and PubMedCentral etc)
// ##### ==============================================================================
// ##### Comment before the initialisation
// ##### Notes: N/A
// ##### ==============================================================================


// ###########################################
// ##### Import required modules (START) #####
// ###########################################
import { config } from "dotenv";
import { parse } from "deno-std-flags";
import * as retried from "retried";

import { readJSON, readJSONFromURL, writeJSON, writeTXT } from "flat-data";
import * as citationJS from "@citation-js/core";
import "@enkore/citationjs-plugin";
// ##### Note: xmlexporter is imported to save contents to file(XML)
import { generateXML } from "./lib/xmlexporter.js"; // ##### Note: get needed information and scripts from (xmlexporter.js)
import get from "just-safe-get";
import extend from "just-extend";
import * as log from "deno-std-log";
// ##### Note: information about API's sources, logging and additional settings
import { abstractSources, logging, settings } from "./config.js"; // ##### Note: get needed information and scripts from (config.js)

// ##### Note: It is needed to bring some standard modules from Node to process some information
// ##### Note: https://reflect.run/articles/how-to-use-node-modules-in-deno/#:~:text=The%20Deno%20std%2Fnode%20library,to%20import%20and%20use%20Node.
import { createRequire } from "https://deno.land/std/node/module.ts";
const require = createRequire(import.meta.url);
const path = require("path");

import {cron, daily, monthly, weekly} from 'https://deno.land/x/deno_cron/cron.ts';

// #########################################
// ##### Import required modules (END) #####
// #########################################


// ######################################################
// ##### Information for console debugging purposes #####
// ######################################################
const filename_this = "Log(process.js): "; // ##### Note: not needed because process.js is currently using dl.debug("string"), you may see config.js for details;

const sleep = (time = 1000) =>
  new Promise((resolve) => setTimeout(resolve, time));

// #####################################################
// ##### Function to process all arguments (START) #####
// #####################################################
// ##### Note: This function is called by main()
// ##### Note: This function calls fetchURLEntries(), saveFileEntries(), and fetchFileEntries()
async function processArgs(args) {

  const parsedArgs = parse(args, {

    string: ["entries", "filename"],

    alias: {

      pull: "p", // ##### Note: If pull (false), then a filename must be given in (deno.jsonc)
      url: "u",
      items: "i",
      // read: "r", // #### Note: using filename (file) directly to read when pull is false
      file: "f",
      offset: "o",
      size: "s",
      delay: "d",

    },

    default: {

      pull: settings?.data?.pull || true,
      url: settings?.data?.url || null,
      items: settings?.data?.items || null,
      // read: settings?.data?.read || false,
      file: settings?.data?.file || null,
      offset: settings?.processing?.initialOffset || 0,
      size: settings?.processing?.batchSize || 10,
      delay: settings?.processing?.processingDelay || 5000,

    },

    boolean: ["pull", "read"],
    negatable: ["pull", "read"],

  });


  // ###############################################################
  // ##### Pull from Url or Read from file the entries (START) #####
  // ###############################################################
  let entries = {};
  if (parsedArgs.pull) { // ##### Note: If true use get entries from Wikidata with fetchURLEntries

    dl.debug("Log(processArgs): Pulling entries from URL");
    const retrieved = await fetchURLEntries(parsedArgs.url);
    extend(entries, retrieved);

    if (parsedArgs.file) {

      await saveFileEntries(parsedArgs.file, retrieved); // ##### Note: If filename to save entries is given in (deno.jsonc) or (config.js) then save entries to it 
    
    }

  } else {

    dl.debug("Log(processArgs): Pulling entries from provided file");
    //if (parsedArgs.read && parsedArgs.file) { // ##### Note: If (No Pull) with read (true) and filename (given)

    if (parsedArgs.file) { // ##### Note: If (No Pull) and filename (given)

      dl.debug(`Log(processArgs): Fetching file: ${parsedArgs.file}`);
      const read = await fetchFileEntries(parsedArgs.file);
      extend(entries, read);

    }

  }

  // ##### Note: Passing Wikidata elements from items list
  let items = entries?.results?.bindings?.map((x) => x?.item?.value) || []; // ##### Note: defining entries
  // #############################################################
  // ##### Pull from Url or Read from file the entries (END) #####
  // #############################################################

  if (parsedArgs.items) {

    items = [...items, ...parsedArgs?.items?.split("|")];

  }

  dl.debug(`Log(processArgs): Total items for processing = ${items.length}`);

  // ##### Note: (items) contains an Array of WikidataItems-URLs extracted from entries.json
  // ##### Example: ["http://www.wikidata.org/entity/Q33482830","http://www.wikidata.org/entity/Q56450031",...,"http://www.wikidata.org/entity/Q110745069"]
  // dl.debug("Log(processArgs): items(URLs) for processing are:");
  // dl.debug(`Log(processArgs): ${items}`); // ##### Note: If you wish to check, then uncomment this line


  // #################################################################
  // ##### To empty files of WikidataItems not in SPARQL (START) #####
  // #################################################################
  const files_emptied = await checkWikidataItem(items);
  dl.debug(`Log(processArgs) files emptied: ${files_emptied}`);
  // ###############################################################
  // ##### To empty files of WikidataItems not in SPARQL (END) #####
  // ###############################################################

  return { parsedArgs, items };
}
// ###################################################
// ##### Function to process all arguments (END) #####
// ###################################################


// ####################################################
// ##### Function to get URL entries-list (START) #####
// ####################################################
// ##### Note: Requesting information via SPARQL to Wikidata, which is used to create entries.json
// ##### Note: This function is called by processArgs()
async function fetchURLEntries(url) {

  if (!url) {

    dl.error("Log(fetchURLEntries): No url to fetch! Exiting...");  // ##### Note: ERROR-FETCH
    Deno.exit(1);
    return;

  }

  dl.debug(`Log(fetchURLEntries): Fetching entries from ${url}`);
  const entries = await readJSONFromURL(url);
  dl.debug(`Log(fetchURLEntries): Entries retrieved from url: ${entries?.results?.bindings?.length}`);

  return entries;

}
// ##################################################
// ##### Function to get URL entries-list (END) #####
// ##################################################


// #################################################
// ##### Function to save entries.json (START) #####
// #################################################
// ##### Note: Saving information returned from fetchURLEntries
// ##### Note: This function is called by processArgs()
async function saveFileEntries(file, entries) {

  const fileSave = await writeJSON(file, entries, null, 2);
  dl.debug(`Log(saveFileEntries): File written: ${file} - ${fileSave}`);

  return fileSave;
}
// ###############################################
// ##### Function to save entries.json (END) #####
// ###############################################


// ################################################
// ##### Function to get URL contents (START) #####
// ################################################
// ##### Note: Requesting information for each files listed in entries.json
// ##### Note: This function is called by processArgs() 
async function fetchFileEntries(file) {

  if (!file) return;

  const entries = await readJSON(file).catch((error) => {  // ##### Note: ERROR-FETCH

    dl.error(`Log(fetchFileEntries): ERROR: ${error}`);
    Deno.exit(1);

  });

  dl.debug(`Log(fetchFileEntries): ${entries.length} entries retrieved from file: ${file}`);

  return entries;

}
// ##############################################
// ##### Function to get URL contents (END) #####
// ##############################################


// ######################################################################
// ##### Function to check requested and saved WikidataItem (START) #####
// ######################################################################
async function checkWikidataItem(items) {

  // ##### Note: For LOOP-1
  const fs = require('fs');
  const files = fs.readdirSync('./corpus/processed/'); // ##### Note: Existing XML files in directory (/corpus/processed)
  const files_list = files;
  let total_files = files_list.length;
  // dl.debug("Log(checkWikidataItem): Existing files:");
  // dl.debug(files); // ##### Note: Display files in directory (/corpus/processed)

  // ##### Note: For LOOP-2
  const str_replace1 = "http://www.wikidata.org/entity/"; // ##### Note: string to replace in list of URL
  const str_replace2 = ""; // ##### Note: string to replace in list of URL
  const items_list = items;

  // ##### Note: Control for how many files were emptied and replaced
  let total_files_emptied = 0;
  let total_files_replaced = 0;

  // ##### Note: loop over elements already saved in directory (/corpus/processed)
  for (let i = 0; i < files_list.length; i++) {

    const files_list_i = String(files_list[i]);
    // dl.debug(files_list_i); // ##### Note: item already saved in directory (processed)
    // dl.debug("============");

    let keep_wikidataitem_saved = 0;
    
    for (let j = 0; j < items_list.length; j++) { 
    
      const string_list_j = String(items_list[j]).replace(str_replace1, str_replace2);
      // dl.debug(string_list_j); // ##### Note: ULR reduced to ID of WikidataItem
      // dl.debug("= = = = =");
      const string_list_j2 = `${string_list_j}.xml`; // ##### Note: appending extension to lock end of string.

      if (files_list_i.includes(string_list_j2)) {
        
        keep_wikidataitem_saved++;

      }

    } 

    if (keep_wikidataitem_saved == 0) {

      dl.debug(`Log(checkWikidataItem): Emptying existing item: ${files_list_i}`);
      total_files_emptied++;

      // ##### Note: content to write inside file to be emptied

      try {

        const fs_p = require('fs').promises;
        const content = await fs_p.readFile("./corpus/Template_emptied_XML.txt");
        const filename = `./corpus/processed/${files_list_i}`;
        await writeTXT(filename, content);
        dl.debug(`Log(checkWikidataItem): template given [./corpus/Template_emptied_XML.txt] and considered to write file [${files_list_i}]`);

      } catch(err) {

        const content = "DELETED";
        const filename = `./corpus/processed/${files_list_i}`;
        await writeTXT(filename, content);
        dl.debug(`Log(checkWikidataItem): template missing [./corpus/Template_emptied_XML.txt], so we are using (NULL) to write file  [${files_list_i}]`);

      }

    } else {

      dl.debug(`Log(checkWikidataItem): Replacing existing item: ${files_list_i}`);
      total_files_replaced++;

    }

  }

  dl.debug(`Log(checkWikidataItem): total items pre-saved [${total_files}], emptied[${total_files_emptied}], replaced[${total_files_replaced}]`);

  return total_files_emptied;

}
// ####################################################################
// ##### Function to check requested and saved WikidataItem (END) #####
// ####################################################################


// ################################
// ##### Validade XML (START) #####
// ################################
// ##### Note: (OPTION-1) XMLvalidation_All() can be applied when all XML files are created near the end of main().
// ##### Note: (OPTION-2) XMLvalidaiton_Each(filename) can be applied inside processItem(), and it can use the return from generateXML().
// ##### Note: To check validation online: https://validator.w3.org/ 

async function XMLvalidation_All() {
  // ##### Note: Using Node.js module: available are fs.readFile, fs.readFileSync
  
  const fs = require('fs');
  const files = fs.readdirSync('./corpus/processed/'); // ##### Note: Existing XML files in directory (/corpus/processed)
  const files_list = files;
  let total_files = files_list.length;

  // ##### Note: loop over elements already saved in directory (/corpus/processed)
  for (let i = 0; i < files_list.length; i++) {

    const files_list_i = String(files_list[i]);
    // dl.debug(files_list_i); // ##### Note: item already saved in directory (processed)
    // dl.debug("============");

    const filename = `./corpus/processed/${files_list_i}`;
    dl.debug("Log(XMLvalidation_All): ============");
    dl.debug(`Log(XMLvalidation_All): ${filename}`);

    // ##### Note: Temporary txt file to store  XML string content
    const filename_temp = './corpus/processed/TEMP.txt';
    const fs = require('fs'); 
    fs.copyFile(filename, filename_temp, (err) => {

      if (err) throw err;
      // dl.debug('Temporary file copied');

    });

    // ##### Note: Reading the string content from XML_converted_to_TXT
    const fs_p = require('fs').promises;
    const content = await fs_p.readFile(filename);
    const content_string = String(content);
    // dl.debug("= = = = = =");
    // dl.debug(content_string);

    // ##### Note: Delete temporary file because XML-string is stored in variable (content_string)
    fs.unlink(filename_temp, (err) => {
      if (err) {
          // throw err;
          // dl.debug("Delete file failed.");
      }
      // dl.debug("Delete file successfully.");
    });

    // ##### Note: String containing XML information is now created.
    // ##### Note: We are now assessing its validation
    // ##### Note: Variable (content_string)
    // ##### https://learn.microsoft.com/en-us/dotnet/standard/data/xml/xml-schema-xsd-validation-with-xmlschemaset (For C#)


    // ##### Note: Function for validating XML files.

    function XML_validator_option1(content_string) {

      // ################################################
      // ##### Note: OPTION-1: XML hand-implemented #####
      // ################################################

      const content_string2 = content_string;

      let content_string3 = content_string2.split('\n'); // ##### Note: Converting string to list of string for individual line assessment

      // dl.debug('Log(XMLvalidation_All): #################################');
      // dl.debug('Log(XMLvalidation_All): XML-CONTENT-BELOW');
      // console.log(content_string3);
      // dl.debug('Log(XMLvalidation_All): #################################');

      // ##### Note: List of strings to be confirmed
      const XML_row_1 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      const XML_row_2 = '<oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">';
      const XML_row_end = '</oai_dc:dc>';

      let XML_row_1_value = 0;
      let XML_row_2_value = 0;
      let XML_row_end_value = 0;

      for (let j = 0; j < content_string3.length; j++) { // ##### Note: loop through the rows of the XML file

        const content_string3_j = String(content_string3[j]);

        // ##### Note: Quality check of row_1
        if (j == 0) {

          // ##### Note: (includes) or (equal) may suit below. However, (equal) would not accept empty spaces starting and ending the string.
          if (content_string3_j.includes(XML_row_1)) {

            dl.debug("Log(XMLvalidation_All): Quality check of row_1: PASSED!");
            XML_row_1_value++; // ##### Note: adding 1 because it is passed.

          } else {

            dl.debug("Log(XMLvalidation_All): Quality check of row_1: FAILED!");
  
          }        

        } 

        // ##### Note: Quality check of row_2
        if (j == 1) {

          // ##### Note: (includes) or (equal) may suit below. However, (equal) would not accept empty spaces starting and ending the string.
          if (content_string3_j.includes(XML_row_2)) {

            dl.debug("Log(XMLvalidation_All): Quality check of row_2: PASSED!");
            XML_row_2_value++; // ##### Note: adding 1 because it is passed.

          } else {

            dl.debug("Log(XMLvalidation_All): Quality check of row_2: FAILED!");
  
          }        

        } 

        // ##### Note: Quality check of row_end
        if (j == content_string3.length-1) {

          // ##### Note: (includes) or (equal) may suit below. However, (equal) would not accept empty spaces starting and ending the string.
          if (content_string3_j.includes(XML_row_end)) {

            dl.debug("Log(XMLvalidation_All): Quality check of row_end: PASSED!");
            XML_row_end_value++; // ##### Note: adding 1 because it is passed.

          } else {

            dl.debug("Log(XMLvalidation_All): Quality check of row_end: FAILED!");
  
          }

        }

      }

      const XML_result_string = `Quality check all rows: row_1: ${XML_row_1_value}; row_2: ${XML_row_2_value}; row_end: ${XML_row_end_value} [Note: passed:0; failed:1]`
      dl.debug(`Log(XMLvalidation_All): ${XML_result_string}`);

      const XML_result = "validator-1: passed";

      return XML_result

    }

    function XML_validator_option2(content_string) {

      // #########################################
      // ##### Note: OPTION-2: XML validator #####
      // #########################################
      // ##### Note: You must have jsdom for DOM checking (see error message).
      // ##### https://stackoverflow.com/questions/6334119/check-for-xml-errors-using-javascript

      const content_string2 = content_string;

      // ##### Note: Once it runs fine, just place in function!
      try {

        const jsdom = require("jsdom");
        dl.debug('Log(XMLvalidation_All): PASSED: Module (jsdom) is available.');

      } catch(err) {
      
        dl.debug('Log(XMLvalidation_All): FAILED: You must install module (jsdom), which is currently missing.');
        dl.debug('Log(XMLvalidation_All): For Ubuntu (check your distribution), run the following lines.');
        dl.debug('Log(XMLvalidation_All): Line: $ sudo apt install npm');
        dl.debug('Log(XMLvalidation_All): Line: $ npm install jsdom');
        dl.debug('Log(XMLvalidation_All): Line: $ npm install xmlhttprequest');

      }

      const XML_result = "validator-2: passed";

      return XML_result

    }

    function XML_validator_option3(content_string) {

      // #########################################
      // ##### Note: OPTION-3: XML validator #####
      // #########################################
      // ##### Note: You must have fast-xml-parse.
      // ##### https://www.npmjs.com/package/fast-xml-parser 

      const content_string2 = content_string;

      // ##### Note: Once it runs fine, just place in function!
      try {

        const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");
        const parser = new XMLParser();
        let jObj = parser.parse(XMLdata);
        const builder = new XMLBuilder();
        const xmlContent = builder.build(jObj);
        dl.debug('Log(XMLvalidation_All): PASSED: Module (fast-xml-parser) is available.');

      } catch(err) {
      
        dl.debug('Log(XMLvalidation_All): FAILED: You must install module (fast-xml-parser), which is currently missing.');
        dl.debug('Log(XMLvalidation_All): For Ubuntu (check your distribution), run the following lines.');
        dl.debug('Log(XMLvalidation_All): Line: $ sudo apt install npm');
        dl.debug('Log(XMLvalidation_All): Line: $ npm install fast-xml-parser');

      }

      const XML_result = "validator-3: passed";

      return XML_result

    }

    try {

      // ##### Note: Passing function for validation.
      const XML_validation_result = XML_validator_option1(content_string);
      dl.debug(`Log(XMLvalidation_All): XML-VALIDATOR could properly check file ${filename}`);
      dl.debug(`Log(XMLvalidation_All): XML-RESULT - ${XML_validation_result}`);

    } catch(err) {

      dl.debug(`Log(XMLvalidation_All):XML-VALIDATOR could !NOT! properly check  file ${filename}. ERROR!`);

    }

  }

  return "COMPLETE"

}
// ################################
// ##### Validade XML (END) #####
// ################################


// #########################################################
// ##### Function to request URL with Abstract (START) #####
// #########################################################
// ##### Note: This function is called by findAbstract()
async function getAbstract(src, service) {

  dl.debug(`Log(getAbstract): Entering getAbstract ${service?.name}`);
  const id = src[service.wikidataProperty.label];

  if (id == null) {

    return null;

  }

  const url = service.url(id);

  try {

    const res = await fetch(url);

    if (res.ok) {

      const data = await res.json();
      const out = get(data, service.path);
      return out;

    } else if (res.status == "404") {  // ##### Note: ERROR-NOT-FOUND

      return null;

    }

  } catch (error) {

    dl.error(`Log(getAbstract): Abstract fetch error: ${error} - ${url}`);  // ##### Note: ERROR-FETCH

  } finally {

    dl.debug(`Log(getAbstract): Exiting getAbstract ${service?.name}`);
  }
}
// #######################################################
// ##### Function to request URL with Abstract (END) #####
// #######################################################


// ##################################################################
// ##### Function to extract Abstract from WikidataItem (START) #####
// ##################################################################
// ##### Note: This function aims to find Abstract is available in Wikidata
// ##### Note: This function is called by getItemData()
// ##### Note: This function calls getAbstract()
async function findAbstract(wikidataItem) {

  dl.debug(`Log(findAbstract): Entering findAbstract`);

  for (const source of abstractSources) {

    const foundAbstract = await getAbstract(wikidataItem, source);

    if (foundAbstract) {

      return foundAbstract;

    }

  }

  dl.debug(`Log(findAbstract): Exiting getItemData`);

  return null;

}
// ################################################################
// ##### Function to extract Abstract from WikidataItem (END) #####
// ################################################################


// ###################################################################
// ##### Function to request URL from CrossRef using DOI (START) #####
// ###################################################################
// ##### Note: This function is called by itself and getItemData()
async function getCrossrefItem(DOI, retries = 4, delay = 0) {

  dl.debug(`Log(getCrossrefItem): Entering getCrossrefItem ${DOI}`);

  await delay;

  try {

    const response = await fetch(

      `https://api.crossref.org/works/${encodeURIComponent(DOI)}`,

    );

    if (response.ok) {

      const data = await response.json();
      return data?.message;

    } else if (response.status == "404") { // ##### Note: ERROR-NOT-FOUND

      return null;

    } else if (retries > 0) {

      getCrossrefItem(
        DOI,
        retries - 1,
        response.status == "429" ? 5000 : delay, // ##### Note: ERROR-RATE
      );

    } else {

      dl.error(`Log(getCrossrefItem): CrossRef Fetch Failed: ${DOI}`);  // ##### Note: ERROR-FETCH
      dl.error(response?.headers);

      throw response.status;

    }

  } catch (error) {

    dl.error(`Log(getCrossrefItem): Fetch Failed: ${error}`);   // ##### Note: ERROR-FETCH

  } finally {

    dl.debug("Log(getCrossrefItem): Exiting getCrossrefItem");

  }

}
// #################################################################
// ##### Function to request URL from CrossRef using DOI (END) #####
// #################################################################


// ###########################################################
// ##### Function to process the THREE main data (START) #####
// ###########################################################
// ##### Note: Passing information from the three main API's
// ##### Note: This function is called by getItemData()
async function processItem({ wikidataItem, crossrefItem, accumulatedData }) {

  const wikidataItem_id_string = JSON.stringify(wikidataItem.id);


  // ########################################################
  // ##### Note: wikidataItem to save structure (START) #####
  // ########################################################
  // const wikidataItem_target = `Q35745846`; // ##### Note: optional for whatever ${anything_required}
  const wikidataItem_target = 'Q35745846';
  
  // ##### Note: piece to target specific object contents
  if (wikidataItem_id_string.includes(wikidataItem_target)) {
  
    // ##### Note: Saving structure for wikidataItem
    try {

      const filename = `${wikidataItem.id}_Struct_wikidataItem.json`;
      const wikidataItem_content = JSON.stringify(wikidataItem);
      const content = wikidataItem_content;

      // ######################################################################################################################
      // ##### Note: Uncomment line below to save the strucutre of a required WikidataItem
      //

      // await writeTXT(filename, content); // ##### Note: Saving file to check WikidataItem Strucutre

      //
      // ######################################################################################################################

      setTimeout(() => {  dl.debug(`Log(processItem): filesaved_yes`); }, 500);

    } catch (err) {

      setTimeout(() => {  dl.debug(`Log(processItem): filesaved_no`); }, 500);

    }

  } else {

    // ##### Note: Do nothing!

  }
  // ######################################################
  // ##### Note: wikidataItem to save structure (END) #####
  // ######################################################

  // ##### Note: this script is imported from (/lib/xmlexporter.js)
  dl.debug(`Log(processItem): Entering processItem ${wikidataItem.id}`);
  const filename = `./corpus/processed/wikidata-${wikidataItem.id}.xml`;

  const xml = await generateXML({

    wikidataItem,
    crossrefItem,
    accumulatedData,

  });

  dl.debug(`Log(processItem): About to exit processItem ${wikidataItem.id}`);

  // ##### Note: XMLvalidation can be assessed here via content from (const xml), or maybe after to make sure the file has been written properly.

  return await writeTXT(filename, xml);

}
// #########################################################
// ##### Function to process the THREE main data (END) #####
// #########################################################


// ##########################################################
// ##### Function to cluster data from all APIs (START) #####
// ##########################################################
// ##### Note: Currently merging information from Wikidata, CrossRef, PubMed, and PubMedCentral
// ##### Note: This function is called by main()
// ##### Note: This function calls findAbstract(), getCrossrefItem(),  and processItem()
async function getItemData(items) {

  dl.debug(`Log(getItemData): Started getItemData`);
  const { data } = await new citationJS.Cite.async(items);

  data.forEach(async (item) => {

    dl.debug(`Log(getItemData): wikidataitem id: ${item?.id}`);
    // dl.debug(JSON.stringify(item, null, 2));
    let crossrefItem = await getCrossrefItem(item.DOI); // ##### Note: defining crossrefItem

    const accumulatedData = {

      abstract: await findAbstract(item), // ##### Note: defining accumulatedData

    };

    const process = await processItem({

      wikidataItem: item, // ##### Note: defining wikidataItem as item and passing into function
      crossrefItem,
      accumulatedData,

    });

    await sleep(500);

  });

  dl.debug(`Log(getItemData): Finished getItemData`);

}
// ########################################################
// ##### Function to cluster data from all APIs (END) #####
// ########################################################


// ###################################################
// ##### Function to update the Endpoint (START) #####
// ###################################################
// ##### Note: Currently not used!
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
// #################################################
// ##### Function to update the Endpoint (END) #####
// #################################################


// ################################################
// ##### Function to log WikidataItem (START) #####
// ################################################
async function wikidataItem_log(a) {

  dl.debug("Log(wikidataItem_log): ....");

  const b = a;

  return 0

}
// ################################################
// ##### Function to log WikidataItem (START) #####
// ################################################


// ######################################
// ##### Function-Conductor (START) #####
// ######################################
// ##### Note: This function calls processArgs(), and getItemData()
async function main() {

  dl.debug("Log(main): starting main");

  dl.debug("Log(main): main()_processArgs()_IN");

  const {

    parsedArgs: { offset, size, delay },
    items,  
                                    // ##### Note: items come as return from processArgs
  } = await processArgs(Deno.args);

  if (items?.length < 1) {

    dl.info("Log(main): No items to process - exiting.");
    Deno.exit(0);

  }

  dl.debug("Log(main): main()_processArgs()_OUT");

  // dl.debug(items);
  const startTime = new Date();
  dl.debug("Log(main): ##########");
  dl.debug("Log(main): Main() has just started! #####");
  cl.info(`Log(main): processor started at ${startTime}`);
  dl.debug(`Log(main): processor started at ${startTime}`);
  dl.debug("Log(main): main()_getItemData()_IN");
  dl.debug("Log(main): ##########");

  for (let count = offset; count < items.length; count += size) {

    const batch = items.slice(
      count,
      count + size > items.length ? items.length : count + size,
    );

    cl.info(`Log(main): Processing ${size} entries from ${count}`);
    dl.debug({ count });
    // dl.debug(batch);
    await getItemData(batch);
    dl.debug("Log(main): start sleeping");
    await sleep(delay);
    dl.debug("Log(main): stop sleeping");

  }

  dl.debug("Log(main): ##########");
  dl.debug("Log(main): main()_getItemData()_OUT");
  dl.debug("Log(main): ##########");

  const file_validation = await XMLvalidation_All();
  dl.debug(`Log(main): XML-VALIDATION: ${file_validation}!`);
  dl.debug(`Log(main): XML-VALIDATION: Individual check is presented at log.`);

  //
  //
  // ##### Note: to implement a function that updates the EndPoint here
  // updateEndpoint_test(); // ##### not yet using this function
  //
  //

  const endTime = new Date();
  const milisec1 = 1000;
  cl.info(`Log(main): processor finished at ${endTime}`);
  cl.info(`Log(main): processor took ${(endTime - startTime) / milisec1} seconds for ${items.length} entries`); // ##### Note: check that it is indeed 6000 and not 1000
  dl.debug(`Log(main): processor finished at ${endTime}`);
  dl.debug(`Log(main): processor took ${(endTime - startTime) / milisec1} seconds for ${items.length} entries`);

  dl.debug("Log(main): Main() is now finished! #####");

}
// ####################################
// ##### Function-Conductor (END) #####
// ####################################

await config();
await log.setup(logging);

const dl = log.getLogger();
const cl = log.getLogger('client');

// ##### Note: to call main() within cron.
// if (import.meta.main) { main(); }

console.log(``);
console.log(`##################################################`);
console.log(`#####             CRON SECTION               #####`);
console.log(`##################################################`);
console.log(``);

// #######################################
// ##### CRON - TIME CONTROL (START) #####
// #######################################
// ##### Note: Does not work for javascript to call import inside an eval(). Example: eval("import {cron, daily, monthly, weekly} from 'https://deno.land/x/deno_cron/cron.ts'");
// Note: cron('* * * * * *', () => {function_called(); });
// Note: cron('second minute hour day month day_of_week', () => {function_called(); });
// Example: Use seconds as 1 to initialize in the very first second, just keep it simple cron('1 * * * * *', () => {function_called(); });
// Example: To run every 30 minutes cron('1 /*30 * * * *', () => {function_called(); });
// Example: To run 1st day of every month at mid-night cron('1 0 0 1 */1 *', () => {function_called(); });
// Example: To run 1st to 7th day of every month on 3rd, 6th and 9th hour and every 30 minutes if it's monday cron('1 */30 3,6,9 1-7 */1 1'', () => {function_called(); }); // ##### Need to be tested
// Example: To run every Friday at 23:50:01 cron('1 50 23 * * */5', () => {function_called(); }); // ##### Tested!

// ##### Note: Only one must be true, or all false to run main() without cron
const c1 = false; // ##### Note: (cron alias) can be transferred to arguments if needed.
const c2 = false; // ##### Note: (cron alias) can be transferred to arguments if needed.
const c3 = false; // ##### Note: (cron alias) can be transferred to arguments if needed.

// ##### OPTION-1 (START) ################
async function run_cron_option1(sec1,min1,hr1,weekday1,sec2,min2,hr2,weekday2) {

  dl.debug(`Log(run_cron_option1): Started cron`);

    // #################################################
    // ##### Adjusting weekday from word to number #####
    let weekday_1number = 0; // ##### Note: Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7)
    if (weekday1 == "Monday" || weekday1 == "monday" || weekday1 == "Mon" || weekday1 == "mon") { weekday_1number++; }
    if (weekday1 == "Tuesday" || weekday1 == "tuesday" || weekday1 == "Tue" || weekday1 == "tue") { weekday_1number+=2; }
    if (weekday1 == "Wednesday" || weekday1 == "wednesday" || weekday1 == "Wed" || weekday1 == "wed") { weekday_1number+=3; }
    if (weekday1 == "Thursday" || weekday1 == "thursday" || weekday1 == "Thu" || weekday1 == "thu") { weekday_1number+=4; }
    if (weekday1 == "Friday" || weekday1 == "friday" || weekday1 == "Fri" || weekday1 == "fri") { weekday_1number+=5; }
    if (weekday1 == "Saturday" || weekday1 == "saturday" || weekday1 == "Sat" || weekday1 == "sat") { weekday_1number+=6; }
    if (weekday1 == "Sunday" || weekday1 == "sunday" || weekday1 == "Sun" || weekday1 == "sun") { weekday_1number+=7; }
    const weekday_1string = weekday_1number.toString();
    // #################################################

    // #################################################
    // ##### Adjusting weekday from word to number #####
    let weekday_2number = 0; // ##### Note: Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7)
    if (weekday2 == "Monday" || weekday2 == "monday" || weekday2 == "Mon" || weekday2 == "mon") { weekday_2number++; }
    if (weekday2 == "Tuesday" || weekday2 == "tuesday" || weekday2 == "Tue" || weekday2 == "tue") { weekday_2number+=2; }
    if (weekday2 == "Wednesday" || weekday2 == "wednesday" || weekday2 == "Wed" || weekday2 == "wed") { weekday_2number+=3; }
    if (weekday2 == "Thursday" || weekday2 == "thursday" || weekday2 == "Thu" || weekday2 == "thu") { weekday_2number+=4; }
    if (weekday2 == "Friday" || weekday2 == "friday" || weekday2 == "Fri" || weekday2 == "fri") { weekday_2number+=5; }
    if (weekday2 == "Saturday" || weekday2 == "saturday" || weekday2 == "Sat" || weekday2 == "sat") { weekday_2number+=6; }
    if (weekday2 == "Sunday" || weekday2 == "sunday" || weekday2 == "Sun" || weekday2 == "sun") { weekday_2number+=7; }
    const weekday_2string = weekday_2number.toString();
    // #################################################

  // ##### passed variables: Function-1
  const sec_1 = sec1;
  const min_1 = min1;
  const hr_1 = hr1; // ##### Note: 24format
  //const weekday_1 = weekday1; // ##### Note: Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7)
  const cron_string_control1 = '' + sec_1 + ' ' + min_1 + ' ' + hr_1 + ' * * */' + weekday_1string + '';

  // ##### passed variables: Function-2
  const sec_2 = sec2;
  const min_2 = min2;
  const hr_2 = hr2; // ##### Note: 24format
  //const weekday_2 = weekday2; // ##### Note: Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7)
  const cron_string_control2 = '' + sec_2 + ' ' + min_2 + ' ' + hr_2 + ' * * */' + weekday_2string + '';

  // ##### Function-1
  cron(cron_string_control1, () => { console.log(`################################################################## Log(run_cron_option1): to process main()!`); main(); });

  // ##### Function-2
  async function updateEndpoint_test() { console.log(`########## Endpoint Updated!`); } // ##### Note: Update function can be called inside main() if not here.
  cron(cron_string_control2, () => { console.log(`################################################################## Log(run_cron_option3): to process update()!`); updateEndpoint_test(); }); 

}

if (c1 == true && c2 == false && c3 == false) {

  console.log(`##################################################`);
  console.log(`Log(run_cron_option1): cron being used.`); // ##### Note: we can convert to hours, days, weeks etc.
  console.log(`##################################################`);

  // ##### Input: Function-1
  const sec1 = "1";
  const min1 = "56";
  const hr1 = "6"; // ##### Note: 24format
  const weekday1 = "Monday"; // ##### Note: Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7). Adjusted inside function.
  // ##### Input: Function-2
  const sec2 = "1";
  const min2 = "57";
  const hr2 = "7"; // ##### Note: 24format
  const weekday2 = "Monday"; // ##### Note: Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7). Adjusted inside function.
  
  // ##### Function to call Functions
  run_cron_option1(sec1,min1,hr1,weekday1,sec2,min2,hr2,weekday2);

} else {

  console.log(`##################################################`);
  console.log(`Log(run_cron_option1): cron not used!`);
  console.log(`##################################################`);

  // if (import.meta.main) { main(); }

}

// ##### OPTION-1 (END) ##################

// ##### OPTION-2 (START) ################
async function run_cron_option2(dt1) {
  
  // ##### Note: this option required updateEndpoint() to be called inside main()
  dl.debug(`Log(run_cron_option2): Started cron`);

  // ##### passed variables: Function-1
  const dt_1 = dt1; // ##### Note: time-step (delta-t) in minutes, and passed as string here.
  const cron_string_control1 = '1 */' + dt_1 + ' * * * *';

  // ##### Function-1
  cron(cron_string_control1, () => { console.log(`################################################################## Log(run_cron_option2): to process main()!`); main(); });

}

if (c1 == false && c2 == true && c3 == false) {

  console.log(`##################################################`);
  console.log(`Log(run_cron_option2): cron being used.`); // ##### Note: we can convert to hours, days, weeks etc.
  console.log(`##################################################`);

  // ##### Input: Function-1
  const dt1 = '1';

  // ##### Function to call Functions
  run_cron_option2(dt1);

} else {

  console.log(`##################################################`);
  console.log(`Log(run_cron_option2): cron not used!`);
  console.log(`##################################################`);

  // if (import.meta.main) { main(); }

}
// ##### OPTION-2 (END) ##################

// ##### OPTION-3 (START) ################
async function run_cron_option3(dt1,dt2) {

  dl.debug(`Log(run_cron_option3): Started cron`);

  // ##### passed variables: Function-1
  const dt_1 = dt1; // ##### Note: time-step (delta-t) in minutes, and passed as string here.
  const cron_string_control1 = '1 */' + dt_1 + ' * * * *';

  // ##### passed variables: Function-2
  const dt_2 = dt2; // ##### Note: time-step (delta-t) in minutes, and passed as string here.
  const cron_string_control2 = '1 */' + dt_2 + ' * * * *';

  // ##### Function-1
  cron(cron_string_control1, () => { console.log(`################################################################## Log(run_cron_option3): to process main()!`); main(); });
  
  // ##### Function-2
  async function updateEndpoint_test() { console.log(`########## UPDATED!`); } // ##### Note: Update function can be called inside main() if not here.
  cron(cron_string_control2, () => { console.log(`################################################################## Log(run_cron_option3): to process update()!`); updateEndpoint_test(); }); 

}

if (c1 == false && c2 == false && c3 == true) {

  console.log(`##################################################`);
  console.log(`Log(run_cron_option3): cron being used.`); // ##### Note: we can convert to hours, days, weeks etc.
  console.log(`##################################################`);

  // ##### Input: Function-1
  const dt1 = '5';
  // ##### Input: Function-2
  const dt2 = '1';

  // ##### Function to call Functions
  run_cron_option3(dt1,dt2);

} else {

  console.log(`##################################################`);
  console.log(`Log(run_cron_option3): cron not used!`);
  console.log(`##################################################`);

  // if (import.meta.main) { main(); }

}
// ##### OPTION-3 (END) ##################

// ##### Note: Running main() without cron
if (c1 == false && c2 == false && c3 == false) { if (import.meta.main) { main(); } }

// #####################################
// ##### CRON - TIME CONTROL (END) #####
// #####################################