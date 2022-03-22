import citationJS from "https://dev.jspm.io/@citation-js/core";
import "https://dev.jspm.io/@citation-js/plugin-wikidata";
import xmlbuilder2 from "https://dev.jspm.io/xmlbuilder2";

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
    const out = doc.root().ele("dc:title").txt(data).up();
    return out;
}

function xmlAuthors(doc, data) {
    // console.log({ data });
    const out = data.map((x) =>
        doc.root().ele("dc:creator").txt(`${x.family}, ${x.given}`).up(),
    );
    return out;
}

function xmlPublicationType(doc, data) {
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
    const _date = data.map((x) => (x < 10 ? `0${x}` : `${x}`));
    const out = doc.root().ele("dc:date").txt(_date.join("-")).up();
    return out;
}

function xmlLanguage(doc, data) {
    const out = doc.root().ele("dc:language").txt(data);
    return out;
}

function xmlAccessRights(doc, data) {
    const out = null;
    return out;
}

function xmlKeywords(doc, data) {
    const items = data.split(",");
    const out = items.map((x) => doc.root().ele("dc:subject").txt(x).up());
    return out;
}

function xmlPublisher(doc, data) {
    if (!data) return;
    const out = doc.root().ele("dc:publisher").txt(data).up();
    return out;
}

export async function get(qid) {
    console.log(`enter exporter: ${qid}`);
    console.log("citation JS call start");
    const result = await new citationJS.Cite.async(qid);
    console.log("citation JS call stop");
    const data = result.data[0];
    const xmlDoc = xmlRoot();
    xmlIdentifier(xmlDoc, `https://wikidata.org/entity/${qid}`);
    xmlIdentifier(xmlDoc, data["URL"]);
    xmlTitle(xmlDoc, data["title"]);
    xmlAuthors(xmlDoc, data["author"]);
    xmlPublicationType(xmlDoc, data["type"]);
    xmlPublicationDate(xmlDoc, data["issued"]["date-parts"][0]);
    xmlLanguage(xmlDoc, data["language"]);
    // xmlAccessRights(xmlDoc, null);
    xmlKeywords(xmlDoc, data["keyword"]);
    xmlPublisher(xmlDoc, data["journalAbbreviation"] || null);
    const xml = xmlDoc.end({ prettyPrint: true });
    console.log(`leave exporter: ${qid}`);
    return xml;
}
