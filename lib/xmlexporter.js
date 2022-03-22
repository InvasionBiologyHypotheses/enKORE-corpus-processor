import { Cite } from "https://unpkg.com/@citation-js/core@0.5.4/lib/index.js";
import "https://unpkg.com/@citation-js/plugin-wikidata@0.5.4/lib/index.js";
import { create } from "https://unpkg.com/xmlbuilder2@3.0.2/lib/xmlbuilder2.min.js";

function xmlRoot() {
    const out = create({
        version: "1.0",
        encoding: "UTF-8",
        standalone: "yes",
    }).ele("oai_dc:dc", {
        "xmlns:dc": "http://purl.org/dc/elements/1.1/",
        "xmlns:oai_dc": "http://www.openarchives.org/OAI/2.0/oai_dc/",
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xsi:schemaLocation":
            "http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd",
    });
    return out;
}

function xmlUrl(doc, data) {
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

function xmlPublicationDate(doc, data) {
    console.log({ data });
    console.log(data.join("-"));
    const out = doc.root().ele("dc:date").txt(data.join("-")).up();
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

export async function get({ params: { qid } }) {
    const result = await new Cite.async(qid);
    const data = result.data[0];
    const xmlDoc = xmlRoot();
    xmlUrl(xmlDoc, data["URL"]);
    xmlTitle(xmlDoc, data["title"]);
    xmlAuthors(xmlDoc, data["author"]);
    xmlPublicationDate(xmlDoc, data["issued"]["date-parts"][0]);
    xmlLanguage(xmlDoc, data["language"]);
    // xmlAccessRights(xmlDoc, null);
    xmlKeywords(xmlDoc, data["keyword"]);
    xmlPublisher(xmlDoc, data["journalAbbreviation"] || null);
    const xml = xmlDoc.end({ prettyPrint: true });
    return xml;
}
