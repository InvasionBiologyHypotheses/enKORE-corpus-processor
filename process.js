// ##### ==============================================================================
// ##### This script is the main conductor for the branch (enKORE-corpus-processor-main)
// ##### This branch is under the umbrella of enKORE-project
// ##### As the main outcome, XML files are generated for publications sourced from a
// ##### a SPARQL submitted to Wikidata
// ##### ==============================================================================
// ##### Comment about meta and source of input data
// ##### Name: process.js
// ##### Purpose: Create a corpus for the EndPoint source BASE (https://www.base-search.net/about/en/about_sources_data.php)
// ##### Author: Steph Tyszka et al. (https://github.com/bootsa)
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
import "@enkore/citationjs-plugin"; // ##### 
//import 'https://raw.githubusercontent.com/InvasionBiologyHypotheses/enKORE-citation-js-plugin/main/src/index.js';

// ##### Note: function to provide date now in UTM
import { function_DateNow } from "./lib/DateNow.js";

// ##### Note: function to log in different files when needed
import { function_log_new } from "./lib/log.js";
import { function_log_append } from "./lib/log.js";

// ##### Note: xmlexporter is imported to save contents to file(XML)
import { generateXML } from "./lib/xmlexporter.js"; // ##### Note: get needed information and scripts from (xmlexporter.js)
// ##### Note: xmlvalidator is imported to assess contents from file(XML)
// import { XMLvalidation_All } from "./lib/xmlvalidator.js"; // ##### Note: requires adjustment of paths

import get from "just-safe-get";
import extend from "just-extend";
import * as log from "deno-std-log";
// ##### Note: information about API's sources, logging and additional settings
import { abstractSources, logging, settings } from "./config.js"; // ##### Note: get needed information and scripts from (config.js)

// ##### Note: It is needed to bring some standard modules from Node to process some information
// ##### Note: https://reflect.run/articles/how-to-use-node-modules-in-deno/#:~:text=The%20Deno%20std%2Fnode%20library,to%20import%20and%20use%20Node.
import { createRequire } from "https://deno.land/std/node/module.ts";
const require = createRequire(import.meta.url);

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
    const retrieved = await fetchURLEntries(parsedArgs.url); // ##### Note:  (await) To be used with asynchronous function
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
  // #############################################################
  // ##### Pull from Url or Read from file the entries (END) #####
  // #############################################################


  // #################################################
  // ##### Re-processing list of entries (START) #####
  // #################################################
  const reduce_entries = 1;

  if (reduce_entries == 1) {

    // #############################################
    // ##### Note:Generating reduced file
    const entries_json_obj = await readJSON("./corpus/entries_test1.json").catch((error) => {  // ##### Note: ERROR-FETCH // ##### Note:  (await) To be used with asynchronous function

      dl.error(`Log(fetchFileEntries): ERROR: ${error}`);
      Deno.exit(1);
  
    });

    // ##### Note: Obtaining header and results objects
    let json_head_obj = entries_json_obj.head;
    let json_results_obj = entries_json_obj.results;

    // ##### Note: Obtaining header and results strings
    let json_head_string = '"head":' + JSON.stringify(json_head_obj);
    let json_results_string = '"results":' + JSON.stringify(json_results_obj);
    // dl.debug('{' + json_head_string + "," + json_results_string + '}'); // ##### Note: checking merged json-strings
    let jsonAllObj_new = JSON.parse('{ "results":{"bindings":[]} }'); // ##### Note: Creating an empty object to be appended with unique elements
    // dl.debug(``);
    // dl.debug(`${JSON.stringify(jsonAllObj_new)}`);

    let ii = 0; // ##### Note: index for the buiding jsonAllObj_new

    for (let i = 0; i < entries_json_obj.results.bindings.length; i++) {

      dl.debug(`Object-index obtained from original file of entries: [${i}]`); // ##### Note: index for the jsonAllObj_old

      if (i == 0) {

        ii++; // ##### Note: First element must be unique! Therefore, no checkig condition required.
        // ##### Note: Below we append the information (only the URL is needed)
        // let url2check = entries_json_obj.results.bindings[i].item;
        // jsonAllObj_new.results.bindings[ii-1] = url2check;
        const obj1 = JSON.parse('{ "item": ' + JSON.stringify(entries_json_obj.results.bindings[i].item) + ' }');
        jsonAllObj_new.results.bindings[ii-1] = obj1;
        
        // dl.debug(`Log(processArgs): url2check: ${JSON.stringify(url2check)}`); // ##### Note: This line can be removed, but visually better to keep.

      } else if(i > 0) {

        let jsonAllObj_old = entries_json_obj.results.bindings[i];
        let url2check = jsonAllObj_old.item.value; // ##### Note: element to compare across growing-jsonAllOjb

        dl.debug(`Log(processArgs): URL (i.e. url2check): ${JSON.stringify(url2check)}`);

        if (JSON.stringify(jsonAllObj_new).includes(url2check)) {

          // ##### NOTE: IMPORTANT!
          // ##### NOTE: PIECE BELOW CAN BE ADJUSTED TO WRITE A NEW FILE CONTAINING INFORMATION WITHOUT REPETITIONS OF URLs
          // ##### NOTE: HOWEVER, THE NEW FILE WOULD CONTAIN REPETITIONS OF KEYS CONTAINING SAME AND DIFFERENT VALUES

          dl.debug(`Log(processArgs): URL (i.e. url2check) exists: No URL to be appended.`); // ##### Note: Append only contents that are missing

          // ##### Note: Finding the item inside jsonAllObj_new that contains url2check so it can be appended with extra missig information
          // ##### Note: You cannot append the same URL twice to avoid redownloading it.
          for (let j = 0; j < jsonAllObj_new.results.bindings.length; j++) {          

            if (JSON.stringify(jsonAllObj_new.results.bindings[j]).includes(url2check)) { // ##### Note: here we define index of jsonAllObj_new containing url2check

              let Obj1 = jsonAllObj_new.results.bindings[j]; // ##### Note: Assign as an object
              let Obj2 = jsonAllObj_old; // ##### Note: Retransmitting the object
              delete Obj2.item; // ##### Note: Removing only the URL from retransmitted object
              // ##### Note (ERROR): let Obj3 = Object.assign(Obj1, Obj2); Dos not preserve same key with different values. Therefore, working with strings.

              let Obj1_str = JSON.stringify(Obj1); // ##### Note: Convert to string for a merge
              let Obj2_str = JSON.stringify(Obj2); // ##### Note: Convert to string for a merge

              let Obj3_str = (Obj1_str.slice(0, -1) + "," + Obj2_str.slice(1, Obj2_str.length)).replace(/\\/g, '').replace(/"/g, ""); // ##### Note: removing some characters
              // ##### Note (ERROR) let Obj3 = JSON.parse(Obj3_str); it  deletes identical keys that contain same values and different values

              let Obj3 = {

                Obj3_str

              };

              // ##### Note: Line below are just for checking merged information into new appended object
              // console.log(``);
              // console.log(`OBJECT-1 (objnew): ${JSON.stringify(Obj1)}`);
              // console.log(``);
              // console.log(`OBJECT-2 (objold): ${JSON.stringify(Obj2)}`);
              // console.log(``);
              // console.log(`OBJECT-3 (merged): ${Obj3_str}`);
              // console.log(``);
              // console.log(`OBJECT-3 (merged): ${JSON.stringify(Obj3)}`);
              // jsonAllObj_new.results.bindings[j] = Obj3; // ##### Note: To replace results with appended new result

            }

          }        

        } else {

          dl.debug(`Log(processArgs): URL (i.e. url2check) does not exist in buiding entries.json (here defined as jsonAllObj_new): Appending URL from (jsonAllObj_old) to (jsonAllObj_new).`); // ##### Note: Append all contents
          ii++;
          // ##### Note: Below we append the information (only the URL is needed)
          // jsonAllObj_new.results.bindings[ii-1] = entries_json_obj.results.bindings[i].item;
          const obj1 = JSON.parse('{ "item": ' + JSON.stringify(entries_json_obj.results.bindings[i].item) + ' }');
          jsonAllObj_new.results.bindings[ii-1] = obj1;

        }

      }  

      dl.debug(``);
      dl.debug(`Given index number for the new reduced file of entries: [${ii}]`);
      dl.debug(``);
      dl.debug(`(jsonAllObj_new) total URLs is: ${JSON.stringify(jsonAllObj_new.results.bindings.length)}`); 
      dl.debug(``); 

    }

    // Note: var/const jsonAllObj_new_str = JSON.stringify(jsonAllObj_new); does not allow beaultify json (Ctrl+Shift+I)
    let jsonAllObj_new_str = JSON.stringify(jsonAllObj_new); // ##### Note: var 
    dl.debug(`Log(processArgs): New temporary reduced list of entries is:`);
    dl.debug(`${jsonAllObj_new_str}`);

    // ##### Note: To confirm that string to be saved is a valid json
    async function IfJson_ThenWrite(str) { 

      try { 
        
        JSON.parse(str); 
        await function_log_new('./corpus/','reduced_entries.json',str);
      
      } catch (e) { 
        
        return false; 
      
      } return true; 

    }

    IfJson_ThenWrite(jsonAllObj_new_str);

    // #################################################
    // ##### Note: Reading entries from new reduced file
    function_log_append('./logs/','Log_entries.txt',`Log(fetchFileEntries): Replacing entries sourced from above-defined with entries indicated below`); 
    // ##### Note: You must await here otherwise new file is not considered
    // ##### Note (DO NOT USE): const read = fetchFileEntries("./corpus/entries_test3.json");
    const read = await fetchFileEntries("./corpus/entries_test3.json"); // ##### Note: To pass reduced file here (e.g. reduced_entries.json).
    extend(entries, read);

  }
  // ###############################################
  // ##### Re-processing list of entries (END) #####
  // ###############################################


  // ##### Note: Below we will display URLs to be accessed (repetitions can occur depending on which entries.json is used) #####
  let items = [];

  if (parsedArgs.items) {

    items = [...items, ...parsedArgs?.items?.split("|")];
    dl.debug("Log(processArgs): Extracting entries from parsedArgs.items");

  } else {

    items = entries?.results?.bindings?.map((x) => x?.item?.value) || [];
    dl.debug("Log(processArgs): Extracting entries from file");

  }
  
  // ##### Note: The repetitions of some URLs are not displayed in the total below. 
  // ##### Note: There may be repetitions depending on the entries.json
  dl.debug(`Log(processArgs): List of URLs for processing (further repetitions of URL-requesting can occur depending on which entries.json is used): ${items}`);
  dl.debug(`Log(processArgs): Total URLs for processing (further repetitions of URL-requesting can occur depending on which entries.json is used) = ${items.length}`); 

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


// ##### Note: Function content transferred to ./lib
// ############################################
// ##### Function to get DateNow (START) #####
// ############################################
// ##### Note: To mostly get stamp-time for log-files
// async function function_DateNow() {
// }
// ##########################################
// ##### Function to get Date-now (END) #####
// ##########################################


// ##### Note: Function content transferred to ./lib
// ###################################
// ##### Function to log (START) #####
// ###################################
// ##### Note: To write logs in independent files
// async function function_log_append(dir,filename,c) {
// }
// #################################
// ##### Function to log (END) #####
// #################################


// ####################################################
// ##### Function to get URL entries-list (START) #####
// ####################################################
// ##### Note: Requesting information via SPARQL to Wikidata, which is used to create entries.json
// ##### Note: This function is called by processArgs()
async function fetchURLEntries(url) {

  if (!url) {

    function_log_append('./logs/','Log_entries.txt',`Log(fetchURLEntries): No url: ${url}. Exiting...`); 
    dl.error(`Log(fetchURLEntries): No url: ${url}. Exiting...`);  // ##### Note: ERROR-FETCH
    Deno.exit(1);
    return;

  }
  
  function_log_append('./logs/','Log_entries.txt',`Log(fetchURLEntries): Fetching entries from ${url}`); 
  dl.debug(`Log(fetchURLEntries): Fetching entries from ${url}`);
  const entries = await readJSONFromURL(url); // ##### Note:  (await) To be used with asynchronous function
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

  const fileSave = await writeJSON(file, entries, null, 2); // ##### Note:  (await) To be used with asynchronous function
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

  if (!file) return; // ##### Note: VIP-Flag

  const entries = await readJSON(file).catch((error) => {  // ##### Note: ERROR-FETCH // ##### Note:  (await) To be used with asynchronous function

    dl.error(`Log(fetchFileEntries): ERROR: ${error}`);
    Deno.exit(1);

  });

  //let total_entries  = String(entries.length); // ##### Note: Total is not passing, but can be included in the string below.
 
  function_log_append('./logs/','Log_entries.txt',`Log(fetchFileEntries): Fetching entries retrieved from file: ${file}`); 
  dl.debug(`Log(fetchFileEntries): Fetching entries retrieved from file: ${file}`);

  return entries;

}
// ##############################################
// ##### Function to get URL contents (END) #####
// ##############################################


// ######################################################################
// ##### Function to check requested and saved WikidataItem (START) #####
// ######################################################################
// ##### Note: To check items not listed in entries, which must be emptied.
// ##### Note: Using Node.js module: fs.readdirSync and fs.readFile
// ##### Note: This function is called by processArgs()
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

      total_files_emptied++;

      const item1 = fs.statSync(`./corpus/processed/${files_list_i}`); // ##### Note: item-size
      const item2 = fs.statSync("./corpus/Template_emptied_XML.txt"); // ##### Note: template-size
      // dl.debug(`${item1.size}`); // ##### Note: item-size
      // dl.debug(`${item2.size}`); // ##### Note: template-size

      if (item1.size == item2.size) { // ##### Note: Size must match size of the template

        dl.debug(`Log(checkWikidataItem): Already empty file: ${files_list_i}`);
        dl.debug("Log(checkWikidataItem): Not writting to log.");

      } else {

        function_log_append('./logs/','Log_emptied_files.txt',`Log(checkWikidataItem): Emptying file: ${files_list_i}`); 
        dl.debug(`Log(checkWikidataItem): Emptying file: ${files_list_i}`);

      }
      
      // ##### Note: content to write inside file to be emptied

      try {

        const fs_p = require('fs').promises;
        const content = await fs_p.readFile("./corpus/Template_emptied_XML.txt"); // ##### Note:  (await) To be used with asynchronous function
        const filename = `./corpus/processed/${files_list_i}`;
        await writeTXT(filename, content); // ##### Note:  (await) To be used with asynchronous function
        dl.debug(`Log(checkWikidataItem): template given [./corpus/Template_emptied_XML.txt] and considered to write file [${files_list_i}]`);

      } catch(err) {

        const content = "DELETED";
        const filename = `./corpus/processed/${files_list_i}`;
        await writeTXT(filename, content); // ##### Note:  (await) To be used with asynchronous function
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
// ##### Note: Validation of the XML-file via checking 1) hearder, 2) footer, and 3) body.
// ##### Note: (POSSIBILITY-CONSIDERED) XMLvalidation_All() can be applied when all XML files are created near the end of main().
// ##### Note: (POSSIBILITY-AVAILABLE) XMLvalidaiton_Each(filename) can be applied inside processItem(), and it can use the return from generateXML().
// ##### Note: It is possible to check validation online: https://validator.w3.org/. However, headers may be an issue, though acceptable.
// ##### Note: Using Node.js module: fs.readdirSync, fs.readFile (fs.readFileSync optional)
// ##### Note: This function is called by main()

// ##### IMPORTANT: It may be better emptying files not listed in the SPARQL-query, and then calling this function.
// ##### REASON: Tthere is not need to spend more time checking a file which will be later emptied.
async function XMLvalidation_All() {
  // ##### Note: (dl.debug) were changed to (console.log), so that this function can be further transferred into /lib
  // ##### Note: To send this function into ./lib requires internal paths' adjustments (for reading/deleting files from /processed etc)
  // ##### Note: Also remember to change from (async) to (export), which is similar to function_log
  
  const fs = require('fs');
  const files_list = fs.readdirSync('./corpus/processed/'); // ##### Note: Existing XML files in directory (/corpus/processed)
  console.log("");
  console.log("Log(XMLvalidation_All): = = = = = = = = = = = = = = = = = = = =");
  console.log(files_list); // ##### Note: List of XML-files to be validated, and including the emptied ones.
  console.log("Log(XMLvalidation_All): = = = = = = = = = = = = = = = = = = = =");
  console.log("");
  let total_files = files_list.length;

  // ##### Note: loop over elements already saved in directory (/corpus/processed)
  for (let i = 0; i < files_list.length; i++) {

    const files_list_i = String(files_list[i]);
    console.log("============ %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
    console.log(files_list_i); // ##### Note: item already saved in directory (processed)
    console.log("============");

    const filename = `./corpus/processed/${files_list_i}`;
    console.log("Log(XMLvalidation_All): ===== I ===== T ===== E ===== M =====");
    console.log(`Log(XMLvalidation_All): ${filename}`);

    // ##### Note: Temporary txt file to store  XML string content
    const filename_temp = './corpus/processed/TEMP.txt';
    const fs = require('fs'); 
    fs.copyFile(filename, filename_temp, (err) => {

      if (err) throw err;
      // console.log('Temporary file copied');

    });

    // ##### Note: Reading the string content from XML_converted_to_TXT
    const fs_p = require('fs').promises;

    // ####################
    const content = await fs_p.readFile(filename); // Note: To be used with asynchronous function
    // const content = fs_p.readFile(filename); // Note: To be used with synchronous function (also in export function)
    // ####################

    const content_string = String(content);
    // console.log("= = = = = =");
    // console.log(content_string);

    // ##### Note: Delete temporary file because XML-string is stored in variable (content_string)
    fs.unlink(filename_temp, (err) => {
      if (err) {
          // throw err;
          // console.log("Delete file failed.");
      }
      // console.log("Delete file successfully.");
    });

    // ##### Note: String containing XML information is now created.
    // ##### Note: We are now assessing its validation
    // ##### Note: Variable (content_string)
    // ##### https://learn.microsoft.com/en-us/dotnet/standard/data/xml/xml-schema-xsd-validation-with-xmlschemaset (For C#)


    // #############################################################
    // ##### Note: Creating functions for validating XML files #####
    // #############################################################

    function XML_validator_option1(filename,content_string) {

      // ###################################
      // ##### OPTION-1: XML validator #####
      // ###################################
      // ##### Note: Hand-implemented to deal with different headers

      const filename_string = filename;
      let content_string2 = content_string.split('\n'); // ##### Note: Converting string to list of string for individual line assessment

      if (content_string2.length > 1) { // ##### Note: XML-files not found in SPARQL will come empty! That is [""].

        console.log('Log(XMLvalidation_All): = = = = = =');
        console.log('Log(XMLvalidation_All): XML-CONTENT-BELOW');
        // console.log(content_string2);
        console.log('Log(XMLvalidation_All): = = = = = =');

        // ##### Note: List of strings to be confirmed inside the XML-content
        const XML_row_1 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        const XML_row_2 = '<oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">';
        const XML_row_end = '</oai_dc:dc>';

        let XML_row_1_value = 0; // ##### Note: to be changed to 1 when passing the checking.
        let XML_row_2_value = 0; // ##### Note: to be changed to 1 when passing the checking.
        let XML_row_end_value = 0; // ##### Note: to be changed to 1 when passing the checking.

        for (let j = 0; j < content_string2.length; j++) { // ##### Note: loop through the rows of the XML file

          const content_string2_j = String(content_string2[j]);


          // ################################
          // ##### Quality-Check: row_1 #####
          // ################################
          if (j == 0) {

            // ##### Note: (includes) or (equal) may suit below. However, (equal) would not accept empty spaces starting and ending the string.
            if (content_string2_j.includes(XML_row_1)) {

              console.log("Log(XMLvalidation_All): Quality check of row_1: PASSED!");
              XML_row_1_value++; // ##### Note: adding 1 because it is passed.

            } else {

              console.log("Log(XMLvalidation_All): Quality check of row_1: FAILED!");
    
            }        

          } 


          // ################################
          // ##### Quality-Check: row_2 #####
          // ################################
          if (j == 1) {

            // ##### Note: (includes) or (equal) may suit below. However, (equal) would not accept empty spaces starting and ending the string.
            if (content_string2_j.includes(XML_row_2)) {

              console.log("Log(XMLvalidation_All): Quality check of row_2: PASSED!");
              XML_row_2_value++; // ##### Note: adding 1 because it is passed.

            } else {

              console.log("Log(XMLvalidation_All): Quality check of row_2: FAILED!");
    
            }        

          } 


          // ##################################
          // ##### Quality-Check: row_end #####
          // ##################################
          if (j == content_string2.length-1) {

            // ##### Note: (includes) or (equal) may suit below. However, (equal) may complicate due to empty spaces starting and ending the string.
            if (content_string2_j.includes(XML_row_end)) {

              console.log("Log(XMLvalidation_All): Quality check of row_end: PASSED!");
              XML_row_end_value++; // ##### Note: adding 1 because it is passed.

            } else {

              console.log("Log(XMLvalidation_All): Quality check of row_end: FAILED!");
    
            }

          }

          // #########################
          // ##### Save DOI list #####
          // #########################
          // ##### Note: Saving DOI list to Log to be further used for NLP processing
          if (j > 1 && content_string2_j.includes("<dc:identifier>") && content_string2_j.includes("doi:") ) {

            let doi_string = content_string2_j.replace("<dc:identifier>", "").replace("doi:", "https://doi.org/").replace("</dc:identifier>", "").replaceAll(" ", ""); 
            function_log_append('./logs/','Log_DOI_list.txt',`${doi_string}`); 

          } else {

            // console.log("Doi not found inside XML-file");

          }

        }

        // ###########################
        // ##### To write result #####
        // ###########################
        const XML_result_write = `Quality check all rows: row_1: ${XML_row_1_value}; row_2: ${XML_row_2_value}; row_end: ${XML_row_end_value}`
        
        console.log(`Log(XMLvalidation_All): ${XML_result_write}`);
        const XML_filename_result_write = ` ${filename_string}: ${XML_result_write}`; // ##### Note: adding filename to save quality save information.
        function_log_append('./logs/','Log_XMLvalidation.txt',XML_filename_result_write); 

        let XML_result_value = XML_row_1_value + XML_row_2_value + XML_row_end_value;

        if (XML_result_value == 3) {

          return "Validator-1: passed all.";

        } else {

          return "Validator-1: failed one at least.";

        }       

      } else {

        return "Validator-1: empty file.";

      }


    }

    function XML_validator_option2(content_string) {

      // ###################################
      // ##### OPTION-2: XML validator #####
      // ###################################
      // ##### Note: You must have jsdom for DOM checking (see error message).
      // ##### https://stackoverflow.com/questions/6334119/check-for-xml-errors-using-javascript

      const content_string2 = content_string;

      // ##### Note: Once it runs fine, just place in function!
      try {

        const jsdom = require("jsdom");
        console.log('Log(XMLvalidation_All): PASSED: Module (jsdom) is available.');

      } catch(err) {
      
        console.log('Log(XMLvalidation_All): FAILED: You must install module (jsdom), which is currently missing.');
        console.log('Log(XMLvalidation_All): For Ubuntu (check your distribution), run the following lines.');
        console.log('Log(XMLvalidation_All): Line: $ sudo apt install npm');
        console.log('Log(XMLvalidation_All): Line: $ npm install jsdom');
        console.log('Log(XMLvalidation_All): Line: $ npm install xmlhttprequest');

      }

      const XML_result = "Validator-2: passed all.";

      return XML_result

    }

    function XML_validator_option3(content_string) {

      // ###################################
      // ##### OPTION-3: XML validator #####
      // ###################################
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
        console.log('Log(XMLvalidation_All): PASSED: Module (fast-xml-parser) is available.');

      } catch(err) {
      
        console.log('Log(XMLvalidation_All): FAILED: You must install module (fast-xml-parser), which is currently missing.');
        console.log('Log(XMLvalidation_All): For Ubuntu (check your distribution), run the following lines.');
        console.log('Log(XMLvalidation_All): Line: $ sudo apt install npm');
        console.log('Log(XMLvalidation_All): Line: $ npm install fast-xml-parser');

      }

      const XML_result = "Validator-3: passed all.";

      return XML_result

    }


    // #####################################
    // ##### Section to call validator #####
    // #####################################

    try {

      // ##### Note: Passing function for validation.
      const XML_validation_result = XML_validator_option1(filename,content_string);
      console.log(`Log(XMLvalidation_All): XML-VALIDATOR could properly check file ${filename}`);
      console.log(`Log(XMLvalidation_All): XML-RESULT - ${XML_validation_result}`);
      console.log(`\n`);
      // ##### Note: To write result into log here.

    } catch(err) {

      console.log(`Log(XMLvalidation_All):XML-VALIDATOR could !NOT! properly check  file ${filename}. ERROR!`);
      console.log(`\n`);

    }

  }

  return "COMPLETE" // ##### Note: This result is returned to main()

}
// ##############################
// ##### Validade XML (END) #####
// ##############################


// #########################################################
// ##### Function to request URL with Abstract (START) #####
// #########################################################
// ##### Note: To download the abstract.
// ##### Note: This function is called by findAbstract()
async function getAbstract(src, service) {

  dl.debug(`Log(getAbstract): Entering getAbstract ${service?.name}`);
  const id = src[service.wikidataProperty.label];

  if (id == null) {

    return null;

  }

  const url = service.url(id);

  try {

    const res = await fetch(url); // ##### Note:  (await) To be used with asynchronous function

    if (res.ok) {

      const data = await res.json(); // ##### Note:  (await) To be used with asynchronous function
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

    const foundAbstract = await getAbstract(wikidataItem, source); // ##### Note:  (await) To be used with asynchronous function

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
// ##### Note: To request information from Crossref
// ##### Note: This function is called by itself and getItemData()
async function getCrossrefItem(DOI, retries = 4, delay = 0) {

  dl.debug(`Log(getCrossrefItem): Entering getCrossrefItem ${DOI}`);

  await delay; // ##### Note:  (await) To be used with asynchronous function

  try {

    const response = await fetch( // ##### Note:  (await) To be used with asynchronous function

      `https://api.crossref.org/works/${encodeURIComponent(DOI)}`,

    );

    if (response.ok) {

      const data = await response.json(); // ##### Note:  (await) To be used with asynchronous function
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

  const xml = await generateXML({ // ##### Note:  (await) To be used with asynchronous function

    wikidataItem,
    crossrefItem,
    accumulatedData,

  });

  dl.debug(`Log(processItem): About to exit processItem ${wikidataItem.id}`);

  // ##### Note: XMLvalidation can be assessed here via content from (const xml), or maybe after to make sure the file has been written properly.

  return await writeTXT(filename, xml); // ##### Note:  (await) To be used with asynchronous function

}
// #########################################################
// ##### Function to process the THREE main data (END) #####
// #########################################################


// ##########################################################
// ##### Function to cluster data from all APIs (START) #####
// ##########################################################
// ##### Note: To get data from (1) wikidataItem, (2) crossrefItem, and (3) accumulatedData
// ##### Note: It merges information from Wikidata, CrossRef, PubMed, PubMedCentral
// ##### Note: This function is called by main()
// ##### Note: This function calls findAbstract(), getCrossrefItem(),  processItem()
async function getItemData(items) {

  dl.debug(`Log(getItemData): Started getItemData`);
  const { data } = await new citationJS.Cite.async(items); // ##### Note:  (await) To be used with asynchronous function
  dl.debug(`Log(getItemData): Received all items from batch.`);

  // ##### Note: (1) SOURCE OF DATA
  data.forEach(async (item) => {

    dl.debug(`Log(getItemData): wikidataitem id: ${item?.id}`);
    // dl.debug(JSON.stringify(item, null, 2));

  // ##### Note: (2) SOURCE OF DATA
    let crossrefItem = await getCrossrefItem(item.DOI); // ##### Note: defining crossrefItem // ##### Note:  (await) To be used with asynchronous function

  // ##### Note: (3) SOURCE OF DATA
    const accumulatedData = {

      abstract: await findAbstract(item), // ##### Note: defining accumulatedData // ##### Note:  (await) To be used with asynchronous function

    };

    const process = await processItem({ // ##### Note:  (await) To be used with asynchronous function

      // ##### Note: (1) SOURCE OF DATA
      wikidataItem: item, // ##### Note: defining wikidataItem as item, and passing into function
      // ##### Note: (2) SOURCE OF DATA
      crossrefItem,
      // ##### Note: (3) SOURCE OF DATA
      accumulatedData,

    });

    await sleep(500); // ##### Note:  (await) To be used with asynchronous function

  });

  dl.debug(`Log(getItemData): Finished getItemData`);

}
// ########################################################
// ##### Function to cluster data from all APIs (END) #####
// ########################################################


// ################################################################################
// ##### Function to compute total content(non-empty) and empty files (START) #####
// ################################################################################
// ##### Note: Computing then total non-empty and empty files at the end of the process.
// ##### OBSERVATION: A script to polish entries will be made and remove repetitions.
async function compute_content_empty_files() {

  // ##### Note: For LOOP-1
  const fs = require('fs');
  const files = fs.readdirSync('./corpus/processed/'); // ##### Note: Existing XML files in directory (/corpus/processed)
  const files_list = files;
  let total_files = files_list.length;
  let total_content = 0;
  let total_empty = 0;

  for (let i = 0; i < files_list.length; i++) {

    const files_list_i = String(files_list[i]);

    const item1 = fs.statSync(`./corpus/processed/${files_list_i}`); // ##### Note: item-size
    const item2 = fs.statSync("./corpus/Template_emptied_XML.txt"); // ##### Note: template-size
    // dl.debug(`${item1.size}`); // ##### Note: item-size
    // dl.debug(`${item2.size}`); // ##### Note: template-size

    if (item1.size == item2.size) { // ##### Note: Size must match size of the template

      total_empty++;
      function_log_append('./logs/','Log_empty_files.txt',`Log(compute_content_empty_files): Empty file: ${files_list_i}`); // ##### Note: Write down name of all empty files

    } else {

      total_content++;

    }

  }

  let total_content_empty = total_content + total_empty;
  
  function_log_append('./logs/','Log_total_files.txt',`Total files: ${total_content_empty}; Total content: ${total_content}; Total empty: ${total_empty}`); 
  dl.debug(`Log(compute_content_empty_files): Total files: ${total_content_empty}; Total content: ${total_content}; Total empty: ${total_empty}`);

  return "COMPLETE"

}
// ##############################################################################
// ##### Function to compute total content(non-empty) and empty files (END) #####
// ##############################################################################


// ###################################################
// ##### Function to update the Endpoint (START) #####
// ###################################################
// ##### Note: Currently not used!
async function updateEndpoint() {

  const response = await fetch(Deno.env.get("UPDATE_URL"), { // ##### Note:  (await) To be used with asynchronous function
    method: "GET",

  });

  dl.debug({ response });
  const message = await response.text(); // ##### Note:  (await) To be used with asynchronous function

  const notificationresponse = await fetch(Deno.env.get("NOTIFICATION_URL"), { // ##### Note:  (await) To be used with asynchronous function

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


// ######################################
// ##### Function-Conductor (START) #####
// ######################################
// ##### Note: This function calls processArgs(), getItemData(), XMLvalidation_All
async function main() {

  dl.debug(`Log(main): entering main() at Date-UTC: ${function_DateNow()}`);
  // ##### Note: Passing datestamp to logs during process start
  function_log_append('./logs/','Log_entries.txt',"= = = = = = = = = = = = = = = = = = = =");
  function_log_append('./logs/','Log_entries.txt',`# Process started at date-UTC: ${function_DateNow()}`);
  function_log_append('./logs/','Log_XMLvalidation.txt',`# Note: Indication of list of entries considered for harvesting information.`);
  function_log_append('./logs/','Log_XMLvalidation.txt',"= = = = = = = = = = = = = = = = = = = =");
  function_log_append('./logs/','Log_XMLvalidation.txt',`# Process started at date-UTC: ${function_DateNow()}`);
  function_log_append('./logs/','Log_XMLvalidation.txt',`# Note: Quality check results are: passed|failed`);
  function_log_append('./logs/','Log_emptied_files.txt',"= = = = = = = = = = = = = = = = = = = =");
  function_log_append('./logs/','Log_emptied_files.txt',`# Process started at date-UTC: ${function_DateNow()}`);
  function_log_append('./logs/','Log_emptied_files.txt',`# Note: List of files that have just been empitied during this process.`);
  function_log_append('./logs/','Log_empty_files.txt',"= = = = = = = = = = = = = = = = = = = =");
  function_log_append('./logs/','Log_empty_files.txt',`# Process started at date-UTC: ${function_DateNow()}`);
  function_log_append('./logs/','Log_empty_files.txt',`# Note: List of files that are empty.`);
  function_log_append('./logs/','Log_total_files.txt',"= = = = = = = = = = = = = = = = = = = =");
  function_log_append('./logs/','Log_total_files.txt',`# Process started at date-UTC: ${function_DateNow()}`);
  function_log_append('./logs/','Log_total_files.txt',`# Note: Indication of total files which have content or not (i.e. empty).`);
  function_log_append('./logs/','Log_invalid_characters.txt',"= = = = = = = = = = = = = = = = = = = =");
  function_log_append('./logs/','Log_invalid_characters.txt',`# Process started at date-UTC: ${function_DateNow()}`);
  function_log_append('./logs/','Log_DOI_list.txt',"= = = = = = = = = = = = = = = = = = = =");
  function_log_append('./logs/','Log_DOI_list.txt',`# Process started at date-UTC: ${function_DateNow()}`);
  function_log_append('./logs/','Log_DOI_list.txt',`# Note: List of DOI obtained from non-empty XML files.`);

  dl.debug("Log(main): starting main()");

  dl.debug("Log(main): main()_processArgs()_IN");

  const {

    parsedArgs: { offset, size, delay },
    items,  
                                    // ##### Note: items come as return from processArgs
  } = await processArgs(Deno.args); // ##### Note:  (await) To be used with asynchronous function

  if (items?.length < 1) {

    dl.info("Log(main): No items to process - exiting.");
    Deno.exit(0);

  }

  dl.debug("Log(main): main()_processArgs()_OUT");

  // dl.debug(items);
  const startTime = new Date();
  dl.debug("Log(main): ##########");
  dl.debug("Log(main): Main() has just started! #####");
  // cl.info(`Log(main): processor started at ${startTime}`);
  dl.debug(`Log(main): processor started at ${startTime}`);
  dl.debug("Log(main): main()_getItemData()_IN");
  dl.debug("Log(main): ##########");

  async function runBatches() {

    for (let count = offset; count < items.length; count += size) {

      const batch = items.slice(
        count,
        count + size > items.length ? items.length : count + size,
      );
  
      // ##### Note: Percentage
      let count_percentage = Math.round(100*count/items.length);
  
      let count_percentage_done = count_percentage/100;
      let count_percentage_todo = 1 - count_percentage_done;
  
      // cl.info(`Log(main): Processing ${size} entries from ${count}`);
      console.log("");
      console.log("= = = = = = = = = =");
      dl.debug(`Log(main): Extracted ${count} items from ${items.length} items`);
  
      let percentage_done = ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>";
      let percentage_todo = "__________________________________________________";
      let percentage_print = percentage_done.slice(0, Math.round(count_percentage_done*(percentage_done.length))) + percentage_todo.slice(0, Math.round(count_percentage_todo*(percentage_todo.length)));
  
      dl.debug(``);
      dl.debug(`Log(main): ${percentage_print} [${count_percentage}%]`);
      dl.debug(``);
  
      dl.debug("Log(main): NEXT BATCH:");
      dl.debug(`Log(main): ${batch}`);
      console.log("= = = = = = = = = =");
      console.log("");
      await getItemData(batch); // ##### Note:  (await) To be used with asynchronous function
      dl.debug("Log(main): start sleeping");
      await sleep(delay); // ##### Note:  (await) To be used with asynchronous function
      dl.debug("Log(main): stop sleeping");
  
    }

    dl.debug("Log(main): ##########");
    dl.debug("Log(main): main()_getItemData()_OUT");
    dl.debug("Log(main): ##########");

    return "Processing of batches complete!"

  }

  // ##### Note: Function to call additional function that are mostly related to quality control.
  async function runExtraFunction() {

    const file_validation = await XMLvalidation_All(); // ##### Note:  (await) To be used with asynchronous function

    dl.debug(`Log(main): XML-VALIDATION: ${file_validation}!`);
    dl.debug(`Log(main): XML-VALIDATION: Individual check is presented at log.`);
  
    dl.debug(`Log(main): Computing files: non-empty and empty.`);
    const computed_files = await compute_content_empty_files();
    dl.debug(`Log(main): Computing files: Task ${computed_files}!`);

    const endTime = new Date();
    const milisec1 = 1000;
    // cl.info(`Log(main): processor finished at ${endTime}`);
    // cl.info(`Log(main): processor took ${(endTime - startTime) / milisec1} seconds for ${items.length} entries`); // ##### Note: check that it is indeed 6000 and not 1000
    dl.debug(`Log(main): processor finished at ${endTime}`);
    dl.debug(``);
    dl.debug(`Log(main): processor took ${(endTime - startTime) / milisec1} seconds for ${items.length} entries`);
    dl.debug(``);

    // ##### Note: Passing datestamp to logs when complete
    function_log_append('./logs/','Log_entries.txt',`# Process complete at date-UTC: ${function_DateNow()}`);
    function_log_append('./logs/','Log_XMLvalidation.txt',`# Process complete at date-UTC: ${function_DateNow()}`);
    function_log_append('./logs/','Log_emptied_files.txt',`# Process complete at date-UTC: ${function_DateNow()}`);
    function_log_append('./logs/','Log_empty_files.txt',`# Process complete at date-UTC: ${function_DateNow()}`);
    function_log_append('./logs/','Log_total_files.txt',`# Process complete at date-UTC: ${function_DateNow()}`);
    function_log_append('./logs/','Log_invalid_characters.txt',`# Process complete at date-UTC: ${function_DateNow()}`);
    function_log_append('./logs/','Log_DOI_list.txt',`# Process complete at date-UTC: ${function_DateNow()}`);

    // ##### Note: Creating report.html at directory logs
    const content = `
    <!DOCTYPE html>
    <head>
    <title>enKORE report</title>
    </head>
    <style>
    body {background-color: powderblue;}
    h1 {color: red;}
    p {color: blue;}
    </style>
    <body>
    <h1>enKORE report</h1>
    <p>
    Last process at date-UTC: ${function_DateNow()}<br>
    Note:<br>
    </p>
    </body>
    </html>
    `;

    function_log_new('./logs/','report.html',content);

    // ##### Note: Copying report.html to public_html. Therefore, we can assess at all times.
    const fs = require('fs');
    try {

      fs.copyFile('./logs/report.html', '/data/project/enkore/public_html/report.html');
      dl.debug('Log(main): Running inside Toolforge. Therefore, report.html was copied inside public_html');
  
    }
    catch(err) {

      dl.debug('Log(main): Running outside Toolforge. Therefore, there is no public_html available to save report.html');

    }
    finally {
      // ##### Note: n/a
    }

    dl.debug("Log(main): Extra function in Main() are now finished! #####");

    return 0

  }

  // ##### Note: To run over list of URL list and save XML files in folder (processed).
  var runBatch_result = runBatches();

  // ##### Note: Function to wait all XML files to be written, and then to check results.
  async function RunBatches_ThenExtraFunctions() {

    await runBatch_result.then((data) => {

      dl.debug("Log(main): " + data);

    })

    console.log("\n\n");
    dl.debug("Log(main): Waiting 10 seconds for remaning files to be saved from xmlexporter inside folder (processed).");
    dl.debug("Log(main): Then final log functions will be executed consedering contents from folder (processed).");
    console.log("\n\n");
    setTimeout(() => {runExtraFunction(); }, 10000); // ##### Note: Waiting some seconds to write last chunck of the batch.
    
  }

  // ##### Note: To call extra functions, which are mostly related to control of results
  RunBatches_ThenExtraFunctions();

}
// ####################################
// ##### Function-Conductor (END) #####
// ####################################

await config(); // ##### Note:  (await) To be used with asynchronous function
await log.setup(logging); // ##### Note:  (await) To be used with asynchronous function

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