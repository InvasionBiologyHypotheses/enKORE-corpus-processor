// ###################################
// ##### Import required modules #####
// ###################################
import xmlbuilder2 from "xmlbuilder2";

// ######################################################
// ##### Information for console debugging purposes #####
// ######################################################
const filename_this = "Log(xmlexporter.js): ";
console.log(filename_this + "Start reading commands from this script for processing!");

// ########################################
// ##### Create Array for openLicenes #####
// ########################################
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

// #####################################
// ##### Function Rooting file XML #####
// #####################################
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

// #################################################
// ##### Function to append information to XML #####
// #################################################
function addXMLElement(doc, { identifier, data }) {
  if (!data) return;
  const _data = Array.isArray(data) ? [...data] : [data];
  _data.forEach((item) =>
    item ? doc.root().ele(identifier).txt(item).up() : null,
  );
}

// ###########################################################
// ##### Function to generate XML (called in process.js) #####
// ###########################################################
export function generateXML({ wikidataItem, crossrefItem, accumulatedData }) {
  const lookup_publicationType = {
    "article-journal": "journal article",
  };


  // #########################################################################
  // ##### Extract json from WikidataItem for further processing (START) #####
  // #########################################################################

  // ####################################
  // ##### Creating: themes (START) #####
  // ####################################

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

      console.log(filename_this + "########################################################################");
      console.log(filename_this + "########## Requirements satisfied for theme(s) to be appended ##########");
      console.log(filename_this + themes_list_complete_i);
      console.log(filename_this + wikidataItem_keyword_string);
      console.log(filename_this + typeof wikidataItem_keyword_string);

      const themes_list_complete_ii = "theme:" + themes_list_complete_i;
      // ##### Note: appending element to the Pre-Empty-Array (themes_list_verified)
      themes_list_verified.push(themes_list_complete_ii);
      console.log(filename_this + "########## Appended element ##########");
      console.log(filename_this + themes_list_verified);
      console.log(filename_this + "##########");

    } else {

      // ##### Note: Do nothing!

    }

  } 

  // ##################################
  // ##### Creating: themes (END) #####
  // ##################################

  // ######################################
  // ##### Creating: VARIABLE (START) #####
  // ######################################
  // ##### Note: Other variables may be passed into this space
  //
  //
  //
  // ####################################
  // ##### Creating: VARIABLE (END) #####
  // ####################################

  // ######################################################################
  // ##### Extract json from WikidataItem for further processing (END)
  // ######################################################################

  if (themes_list_verified.length == 0) {

    // themes_list_verified.push("NULL");
    themes_list_verified.push("");

  }

  // ######################################################################
  // ##### Collecting information from wikidataItem - (START)
  // ######################################################################
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
    { identifier: "dc:rights", data: crossrefItem?.license?.[0].URL },
    
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
      identifier: "dc:description",
      data: accumulatedData.abstract,
      // crossrefItem &&
      // openLicenses.includes(crossrefItem?.license?.[0]?.URL)
      //     ? crossrefItem?.abstract
      //     : null,
    },

  ];
  // ######################################################################
  // ##### Collecting information from wikidataItem - (END)
  // ######################################################################

  // ######################################################################
  // ##### Saving each element from wikidataItem (START)
  // ######################################################################
  const xmlDoc = createXmlRoot();
  elements.forEach((item) => addXMLElement(xmlDoc, item));
  const xml = xmlDoc.end({ prettyPrint: true });
  return xml;
  // ######################################################################
  // ##### Saving each element from wikidataItem (END) #####
  // ######################################################################
}
