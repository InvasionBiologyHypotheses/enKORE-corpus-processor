import xmlbuilder2 from "https://dev.jspm.io/xmlbuilder2";

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

function xmlRoot() {
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

function xmlIdentifier(doc, data) {
    if (!data) return;
    const out = doc.root().ele("dc:identifier").txt(data).up();
    return out;
}

function xmlTitle(doc, data) {
    if (!data) return;
    const out = doc.root().ele("dc:title").txt(data).up();
    return out;
}

function xmlAuthors(doc, data) {
    if (!data) return;
    // console.log({ data });
    const out = data.map((x) =>
        doc.root().ele("dc:creator").txt(`${x.family}, ${x.given}`).up(),
    );
    return out;
}

function xmlPublicationType(doc, data) {
    if (!data) return;
    const lookup = {
        "article-journal": "journal article",
    };
    const out = doc
        .root()
        .ele("dc:type")
        .txt(lookup[data] || "text");
    return out;
}

function xmlPublicationDate(doc, data) {
    if (!data) return;
    const _date = data.map((x) => (x < 10 ? `0${x}` : `${x}`));
    const out = doc.root().ele("dc:date").txt(_date.join("-")).up();
    return out;
}

function xmlLanguage(doc, data) {
    if (!data) return;
    const out = doc.root().ele("dc:language").txt(data);
    return out;
}

function xmlAccessRights(doc, data) {
    if (!data) return;
    const out = doc.root().ele("dc:rights").txt(data);
    return out;
}

function xmlKeywords(doc, data) {
    if (!data) return;
    const items = data.split(",");
    const out = items.map((x) => doc.root().ele("dc:subject").txt(x).up());
    return out;
}

function xmlPublisher(doc, data) {
    if (!data) return;
    const out = doc.root().ele("dc:publisher").txt(data).up();
    return out;
}

function xmlAbstract(doc, data) {
    if (!data) return;
    const out = doc.root().ele("dc:description").txt(data).up();
    return out;
}

export async function generateXML({ wikidataItem, crossrefItem }) {
    console.log({ wikidataItem });
    const xmlDoc = xmlRoot();
    xmlIdentifier(
        xmlDoc,
        `http://www.wikidata.org/entity/${wikidataItem["id"]}`,
    );
    xmlIdentifier(xmlDoc, wikidataItem["URL"]);
    xmlIdentifier(xmlDoc, `doi:${wikidataItem["DOI"]}`);
    xmlTitle(xmlDoc, wikidataItem["title"]);
    xmlAuthors(xmlDoc, wikidataItem["author"]);

    xmlPublicationType(xmlDoc, wikidataItem["type"]);
    xmlPublicationDate(xmlDoc, wikidataItem["issued"]["date-parts"][0]);
    xmlLanguage(xmlDoc, wikidataItem["language"]);
    // xmlAccessRights(xmlDoc, null);
    xmlKeywords(xmlDoc, wikidataItem["keyword"]);
    xmlPublisher(xmlDoc, wikidataItem["journalAbbreviation"] || null);

    // #TODO: Refactor for Wikidata license checking - next two entries

    if (
        crossrefItem &&
        openLicenses.includes(crossrefItem?.license?.[0]?.URL)
    ) {
        xmlAbstract(xmlDoc, crossrefItem?.abstract);
    }

    xmlAccessRights(xmlDoc, crossrefItem?.license?.[0].URL);

    const xml = xmlDoc.end({ prettyPrint: true });
    return xml;
}
