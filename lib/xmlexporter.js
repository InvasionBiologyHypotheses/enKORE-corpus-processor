// ###########################################
// ##### Import required modules (START) #####
// ###########################################
import xmlbuilder2 from "xmlbuilder2";
// #########################################
// ##### Import required modules (END) #####
// #########################################


// ##############################################################
// ##### Information for console debugging purposes (START) #####
// ##############################################################
const filename_this = "Log(xmlexporter.js): ";
console.log(filename_this + "Started reading commands from this script for processing!");
// ############################################################
// ##### Information for console debugging purposes (END) #####
// ############################################################


// ################################################
// ##### Create Array for openLicenes (START) #####
// ################################################
const openLicenses = [

  "https://creativecommons.org/publicdomain/zero/1.0/",
  "https://creativecommons.org/licenses/by/4.0/",
  "https://creativecommons.org/licenses/by/3.0/",
  "https://creativecommons.org/licenses/by/2.5/",
  "https://creativecommons.org/licenses/by/2.0/",
  "https://creativecommons.org/licenses/by/1.0/",
  "https://creativecommons.org/licenses/by-sa/4.0/",
  "https://creativecommons.org/licenses/by-sa/3.0/",
  "https://creativecommons.org/licenses/by-sa/2.5/",
  "https://creativecommons.org/licenses/by-sa/2.0/",
  "https://creativecommons.org/licenses/by-sa/1.0/",
  "http://creativecommons.org/publicdomain/zero/1.0/",
  "http://creativecommons.org/licenses/by/4.0/",
  "http://creativecommons.org/licenses/by/3.0/",
  "http://creativecommons.org/licenses/by/2.5/",
  "http://creativecommons.org/licenses/by/2.0/",
  "http://creativecommons.org/licenses/by/1.0/",
  "http://creativecommons.org/licenses/by-sa/4.0/",
  "http://creativecommons.org/licenses/by-sa/3.0/",
  "http://creativecommons.org/licenses/by-sa/2.5/",
  "http://creativecommons.org/licenses/by-sa/2.0/",
  "http://creativecommons.org/licenses/by-sa/1.0/",

];
// ##############################################
// ##### Create Array for openLicenes (END) #####
// ##############################################

// #############################################
// ##### Function Rooting file XML (START) #####
// #############################################
function createXmlRoot() {

  const out = xmlbuilder2

    .create({

      version: "1.0",
      encoding: "UTF-8",
      standalone: "yes",

    })

    .ele("oai_dc:dc", {

      "xmlns:dc": "http://purl.org/dc/elements/1.1/",
      "xmlns:oai_dc": "http://www.openarchives.org/OAI/2.0/oai_dc/",
      "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "xsi:schemaLocation":
        "http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd",

    });

  return out;

}
// ###########################################
// ##### Function Rooting file XML (END) #####
// ###########################################


// #########################################################
// ##### Function to append information to XML (START) #####
// #########################################################
function addXMLElement(doc, { identifier, data }) {

  if (!data) return;

  const _data = Array.isArray(data) ? [...data] : [data];

  _data.forEach((item) =>
    item ? doc.root().ele(identifier).txt(item).up() : null,
  );

}
// #######################################################
// ##### Function to append information to XML (END) #####
// #######################################################


// ###################################################################
// ##### Function to generate XML (called in process.js) (START) #####
// ###################################################################
export function generateXML({ wikidataItem, crossrefItem, accumulatedData }) {

  const lookup_publicationType = {

    "article-journal": "journal article",
    
  };


  // ########################################################
  // ##### Extract information about copyrights (START) #####
  // ########################################################

  // console.log(filename_this + "###########################################");
  // console.log(filename_this + "########## Processing copyrights ##########");

  const copyrights_string = String(crossrefItem?.license?.[0].URL);

  // console.log(copyrights_string);
  const copyrights_info = [];
  const openacess_info = [];

  if (copyrights_string.includes("creativecommons")) {

    openacess_info.push("yes");
    copyrights_info.push(copyrights_string);

  } else {

    openacess_info.push("no");
    copyrights_info.push(""); // ##### Note: Unknown

  }

  // console.log("Copyrights: " + copyrights_info);
  // console.log("OpenAccess: " + openacess_info);
  // console.log(filename_this + "###########################################");
  // ######################################################
  // ##### Extract information about copyrights (END) #####
  // ######################################################


  // ########################################################################
  // ##### Extract information about description (aka abstract) (START) #####
  // ########################################################################

  // console.log(filename_this + "###########################################################");
  // console.log(filename_this + "########## Processing description (aka abstract) ##########");

  const abstract_info = [];
  const abstract_string = String(accumulatedData.abstract);

  if (String(openacess_info).includes("yes")) {

    if (abstract_string.includes("null")) {

      abstract_info.push(""); // ##### Note: Abstract not found.

    } else {

      // ##### Note: You can push the original abstract that may contain tags, or the abstract without tags.
      // abstract_info.push(String(accumulatedData.abstract)); // ##### Note: keep the original
      abstract_info.push(String(accumulatedData.abstract).replace(/<\/?[^>]+(>|$)/g, "")); // ##### Note: cleaning tags within abstracts

    }

  } else {

    abstract_info.push(""); // ##### Note: Abstract not provided because of rights missing or not openly licensed (CC BY-SA or compatible).

  }

  // console.log("Abstract: " + abstract_info); // ##### Note: Sometimes copyrights are satisfied but Abstract may come as NULL
  // console.log(filename_this + "###########################################################");
  //
  // ######################################################################
  // ##### Extract information about description (aka abstract) (END) #####
  // ######################################################################


  // #################################################################
  // ##### Collecting information from wikidataItem-JSON (START) #####
  // #################################################################
  // #####
  // #####
  // ####################################
  // ##### Creating: themes (START) #####
  // ####################################

  // console.log(filename_this + "#########################################");
  // console.log(filename_this + "########## Processing theme(s) ##########");

  // ##### Note: The element (themes) does not exist inside wikidataItem.
  // ##### Note: The words used for themes are located within the key named "keywords".
  const wikidataItem_id_string = JSON.stringify(wikidataItem.id);
  const wikidataItem_keyword_string = JSON.stringify(wikidataItem["keyword"]);

  // ##### Note: array containing the required strings defining the themes
  const themes_list_complete = ['invasion success', 'invasion impact', 'invasion pathway', 'invasion management'];
  
  // ##### Note: array to be cross-checked (wikidataItem keywords VERSUS themes_list_complete)
  const themes_list_verified = [];

  // ##### Note: looping through complete array
  for (let i = 0; i < themes_list_complete.length; i++) {

    // ##### Note: optional inclusion of wikidataItem for checking with the console.log
    const wikidataItem_target = 'Q'; // ##### Note: 'Q35745846' Can add any WikidataItem to inspect terminal display
    
    // ##### Note: item from the array
    const themes_list_complete_i = themes_list_complete[i];

    // ##### Note: conditions to be satisfied for appending information to the Pre-Empty-Array (themes_list_verified)
    if (typeof wikidataItem_keyword_string !== 'undefined' && wikidataItem_keyword_string.includes(themes_list_complete_i) && wikidataItem_id_string.includes(wikidataItem_target)) {

      // console.log(filename_this + "########## Appending theme(s) ##########");
      // console.log(filename_this + themes_list_complete_i);
      // console.log(filename_this + wikidataItem_keyword_string);
      // console.log(filename_this + typeof wikidataItem_keyword_string);

      const themes_list_complete_ii = "theme:" + themes_list_complete_i;
      // ##### Note: appending element to the Pre-Empty-Array (themes_list_verified)
      themes_list_verified.push(themes_list_complete_ii);

      // ##### themes_list_verified.push(`theme:wikidata.org/entity/${wikidataItem.custom.theme}`); // ##### Note: this solutions is on hold to when Wikidata delivers it.
      
      // ##### Note: special treatment given to themes while these are not handed by wikidata in a very similar way as to hypothesis (.e. WikidataItem.custom.hypothesis)
      if (themes_list_complete_i.includes("success")) {

        themes_list_verified.push(`theme:wikidata.org/entity/Q109467185`);

      } else if (themes_list_complete_i.includes("impact")) {

        themes_list_verified.push(`theme:wikidata.org/entity/Q112148709`);

      } else if (themes_list_complete_i.includes("pathways")) {

        themes_list_verified.push(`theme:wikidata.org/entity/Q111525751`);

      } else {

        // ##### theme: management
        themes_list_verified.push(`theme:wikidata.org/entity/Q113019190`);

      }

      // console.log(filename_this + "########## Appended element ##########");    wikidata.org/entity/
      // console.log(filename_this + themes_list_verified);
      // console.log(filename_this + "##########");

    } else {

      // ##### Note: Do nothing!

    }

  } 

  if (themes_list_verified.length == 0) {

    // themes_list_verified.push("NULL");
    themes_list_verified.push(""); // ##### Note: you can push any string here if no themes are found

  }

  // console.log(filename_this + "###########################################");
  // ##################################
  // ##### Creating: themes (END) #####
  // ##################################


  // ########################################
  // ##### Creating: VARIABLE_A (START) #####
  // ########################################
  // ##### Note: Other variables may be passed into this space
  //
  //
  //
  // ######################################
  // ##### Creating: VARIABLE_A (END) #####
  // ######################################


  // ########################################
  // ##### Creating: VARIABLE_B (START) #####
  // ########################################
  // ##### Note: Other variables may be passed into this space
  //
  //
  //
  // ######################################
  // ##### Creating: VARIABLE_B (END) #####
  // ######################################
  // #####
  // #####
  // ###############################################################
  // ##### Collecting information from wikidataItem-JSON (END) #####
  // ###############################################################


  // #############################################################################
  // ##### Passing information from THREE main sources into elements (START) #####
  // #############################################################################
  const elements = [

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # DOI # " },
    {
      identifier: "dc:identifier",
      data: [
        `http://www.wikidata.org/entity/${wikidataItem["id"]}`,
        wikidataItem["URL"],
        wikidataItem.DOI ? `doi:${wikidataItem["DOI"]}` : null,
      ],
    },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # title # " },
    { identifier: "dc:title", data: wikidataItem["title"] },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # author # " },
    {
      identifier: "dc:creator",
      data: wikidataItem?.["author"]?.map(
        (author) =>
          `${author.family ?? ""}${author.family && author.given ? ", " : ""}${
            author.given ?? ""
          }`,
      ),
    },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # type # " },
    {
      identifier: "dc:type",
      data: lookup_publicationType[wikidataItem["type"]] ?? "text",
    },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # date # " },
    {
      identifier: "dc:date",
      data: wikidataItem["issued"]?.["date-parts"]?.[0]
        ?.map((x) => (x < 10 ? `0${x}` : `${x}`))
        .join("-"),
    },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # language # " },
    { identifier: "dc:language", data: wikidataItem["language"] },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # rights # " },
    // { identifier: "dc:rights", data: crossrefItem?.license?.[0].URL },
    {
      identifier: "dc:rights",
      data: copyrights_info,
    },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # HYPOTHESIS # " },

    // { identifier: "SECTION", data: "#### HYPOTHESIS - format(A) ####" },
    // {
    //   identifier: "dc:subject",
    //   data: wikidataItem?.["custom"]?.["hypothesis"]?.reduce(
    //     (acc, curr) => [
    //       `hypothesis:${curr.label}`,
    //       `hypothesis:wikidata.org/entity/${curr.id} `,
    //       ...acc,
    //     ],
    //     [],
    //   ),
    // },

    // { identifier: "SECTION", data: "#### HYPOTHESIS - format(B) ####" },
    // {
    //   identifier: "dc:subject",
    //   data: wikidataItem?.["custom"]?.["hypothesis"]?.reduce(
    //     (acc, curr) => [
    //       `hypothesis:${curr.label}`,
    //       ...acc,
    //     ],
    //     [],
    //   ),
    // },
    // {
    //   identifier: "dc:subject",
    //   data: wikidataItem?.["custom"]?.["hypothesis"]?.reduce(
    //     (acc, curr) => [
    //       `hypothesis:wikidata.org/entity/${curr.id} `,
    //       ...acc,
    //     ],
    //     [],
    //   ),
    // },

    // ##########################################################
    // { identifier: "dc:CONTROL", data: "#### HYPOTHESIS - format(AB) ####" },
    {
      identifier: "dc:subject",
      data: wikidataItem?.["custom"]?.["hypothesis"]?.reduce(
        (acc, curr) => [
          `${curr.label}`,
          `wikidata.org/entity/${curr.id}`,
          `hypothesis:${curr.label}`,
          `hypothesis:wikidata.org/entity/${curr.id}`,
          ...acc,
        ],
        [],
      ),
    },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # Themes # " },
    {
      identifier: "dc:subject",
      data: themes_list_verified,
    },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # KEYWORD  - format(A) # " },
    {
      identifier: "dc:subject",
      data: wikidataItem["keyword"]?.split(","),
    },
    // { identifier: "SECTION", data: " # KEYWORD  - format(B) # " },
    // {
    //   identifier: "dc:subject",
    //   data: wikidataItem["keyword"],
    // },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # PUBLISHER # " },
    {
      identifier: "dc:publisher",
      data: wikidataItem?.["publisher"] || crossrefItem?.["publisher"] || null,
    },

    // ##########################################################
    // { identifier: "NEW-SECTION", data: "##########" },
    // { identifier: "SECTION", data: " # ABSTRACT # " },
    {
      // identifier: "dc:description",
      // data: accumulatedData.abstract,

      // ### crossrefItem &&
      // ### openLicenses.includes(crossrefItem?.license?.[0]?.URL)
      // ###    ? crossrefItem?.abstract
      // ###    : null,
    },
    {
      identifier: "dc:description",
      data: abstract_info,
    },

  ];
  // ###########################################################################
  // ##### Passing information from THREE main sources into elements (END) #####
  // ###########################################################################


  // ####################################################
  // ##### Remove bad char from json object (START) #####
  // ####################################################

  // ##### FUNCTION OPTION-1 #####
  // ##### https://stackoverflow.com/questions/2670037/how-to-remove-invalid-utf-8-characters-from-a-javascript-string
  // ##### Note: This seems to be a reasonable fix. 
  // ##### Note: Get ASCII chars 0-127, and rebuild the full string char by char. 
  // ##### Note: This removes all non-ASCII characters, but may remove some valid UTF-8. 
  // ##### Note: "ф" is avalid UTF-8 string, but this code snippet returns "". 
  function remove_bad_char1(input) {

    var output = "";

    for (var i=0; i<input.length; i++) {

        if (input.charCodeAt(i) <= 127) {

            output += input.charAt(i); // ##### Note: append ASCII char

        } else {

          // ##### Note: IMPORTANT!
          // ##### Note: Characters passed here are non-ASCII. However, they may still be UTF-8 valid.
          // ##### Note: Not every sequence of bytes is a valid UTF-8 character. 
          // ##### Note: For simplicity, we will checking the SAMPLE OF THE CHARACTER, and not the following:
          // ##### (A) the Unicode hexadecimal number of the character
          // ##### (A) the Unicode name of the character
          // ##### (B) the entity name (as it should be entered in an HTML document)
          // ##### (C) the equivalent numeric character reference. 

          // ##### Note: Bring here list of uncommon characters that are UTF-8 valid
          // ##### Note: http://www.madore.org/~david/computers/unicode/htmlent.html
          //const valid_UTC8 = 'ф';
          const char_p0 = '× ’'; 
          const char_p1 = 'ф ẞ ß Ð ð Ç ç ¢ Ñ ñ Ý ý Ÿ ÿ ® © Þ þ § ¥ £ ¡ ¤'; 
          const char_p2 = 'Á á Â â À à Å å Ã ã Ä ä Æ æ'; 
          const char_p3 = 'É é Ê ê Ç É È Ê Ë'; 
          const char_p4 = 'Í í Î î Ì ì Ï ï'; 
          const char_p5 = 'Ó ó Ô ô Ò ò Ø ø Õ õ Ö ö'; 
          const char_p6 = 'Ú ú Û û Ù ù Ü ü'; 
          const char_p7 = 'Í í Î î Ì ì Ï ï';              
          
          const valid_UTC8 = char_p0 + char_p1 + char_p2 + char_p3 + char_p4 + char_p5 + char_p6 + char_p7;

          // ##### Note:XML escape characters: [ "(Character sample)   &quot(Entity name handed to HTML); '(Character sample)   &apos(Entity name handed to HTML); <(Character sample)   &lt(Entity name handed to HTML); >(Character sample)   &gt(Entity name handed to HTML); &(Character sample)   &amp(Entity name handed to HTML);]
          // ##### https://stackoverflow.com/questions/1091945/what-characters-do-i-need-to-escape-in-xml-documents
          const XML_scape = '< > ! - _ \" \' &';
          // ##### Note:
          const common_char = '± ÷ ~ ` @ # $ % ^ * ( ) + = { } [ ] : , . ? / \\ ;';

          // ##### Note: !!!!! CHECK CONDITIONS USING THE CHARACTER SAMPLE !!!!!
          if (valid_UTC8.includes(input.charAt(i)) || XML_scape.includes(input.charAt(i)) || common_char.includes(input.charAt(i))) {

            output += input.charAt(i);

          } else {

            console.log(filename_this + `Invalid char: ${input.charAt(i)}`);
            // output += "?"; // ##### Note: You can replace invalid char with some special marker
            
          }

        }

    }

    return output;

  }

  // ##### FUNCTION OPTION-2 #####
  // ##### https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI
  // ##### Note: Maybe not needed if (remove_bad_char1) is properly adjusted

  // ##### Converting json-obj to string for quality checking
  const elements_string = JSON.stringify(elements); // ##### Note: convert to string to pass in function
  const elements_string_fixed = remove_bad_char1(elements_string); // ##### Note: return string without BAD-char
  const elements_new = JSON.parse(elements_string_fixed);
  // ##################################################
  // ##### Remove bad char from json object (END) #####
  // ##################################################


  // #########################################################
  // ##### Saving each element from wikidataItem (START) #####
  // #########################################################
  const xmlDoc = createXmlRoot();

  // ##### Note: Using characters as they come may cause issues to the harvesting by BASE. Therefore, UTF8 may help.
  // elements.forEach((item) => addXMLElement(xmlDoc, item));
  elements_new.forEach((item) => addXMLElement(xmlDoc, item));

  const xml = xmlDoc.end({ prettyPrint: true });
  return xml;
  // #######################################################
  // ##### Saving each element from wikidataItem (END) #####
  // #######################################################

}

console.log(filename_this + "Finished reading commands from this script for processing!");
// #################################################################
// ##### Function to generate XML (called in process.js) (END) #####
// #################################################################