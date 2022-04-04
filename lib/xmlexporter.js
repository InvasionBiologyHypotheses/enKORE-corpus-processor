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

function addXMLElement(doc, { identifier, data }) {
    if (!data) return;
    let _data = Array.isArray(data) ? [...data] : [data];
    _data.map((item) =>
        item ? doc.root().ele(identifier).txt(item).up() : null,
    );
}

export async function generateXML({ wikidataItem, crossrefItem }) {
    const lookup_publicationType = {
        "article-journal": "journal article",
    };

    const elements = [
        {
            identifier: "dc:identifier",
            data: [
                `http://www.wikidata.org/entity/${wikidataItem["id"]}`,
                wikidataItem["URL"],
                wikidataItem.DOI ? `doi:${wikidataItem["DOI"]}` : null,
            ],
        },
        { identifier: "dc:link", data: wikidataItem["URL"] },
        { identifier: "dc:title", data: wikidataItem["title"] },
        {
            identifier: "dc:creator",
            data: wikidataItem["author"]?.map(
                (author) =>
                    `${author.family ?? ""}${
                        author.family && author.given ? ", " : ""
                    }${author.given ?? ""}`,
            ),
        },
        {
            identifier: "dc:type",
            data: lookup_publicationType[wikidataItem["type"]] ?? "text",
        },
        {
            identifier: "dc:date",
            data: wikidataItem["issued"]?.["date-parts"]?.[0]
                ?.map((x) => (x < 10 ? `0${x}` : `${x}`))
                .join("-"),
        },
        { identifier: "dc:language", data: wikidataItem["language"] },
        { identifier: "dc:rights", data: crossrefItem?.license?.[0].URL },
        {
            identifier: "dc:subject",
            data: wikidataItem["keyword"]?.split(","),
        },
        {
            identifier: "dc:publisher",
            data: wikidataItem["journalAbbreviation"] || null,
        },
        {
            identifier: "dc:description",
            data:
                crossrefItem &&
                openLicenses.includes(crossrefItem?.license?.[0]?.URL)
                    ? crossrefItem?.abstract
                    : null,
        },
    ];

    const xmlDoc = createXmlRoot();
    elements.map((item) => addXMLElement(xmlDoc, item));

    const xml = xmlDoc.end({ prettyPrint: true });
    return xml;
}
