export const settings = {
  processing: {
    initialOffset: 0,
    processingDelay: 1000,
    batchSize: 50,
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
