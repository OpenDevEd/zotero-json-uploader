function openalexToZotero(data) {
  // Type mapping function
  function typeMap(type) {
    return type === "article" ? "journalArticle" : "report";
  }

  // Function to generate OpenAlex code
  function openalexCode(id) {
    if (id && id.split("/").pop()) {
      return "openalex: " + id.split("/").pop() + "\n";
    }
    return "";
  }

  // Function to generate mag code
  function magCode(id) {
    if (id) {
      return "mag: " + id;
    }
    return "";
  }

  // Function to determine if DOI should be in extra field
  function showDOIInExtra(item) {
    if (item.type !== "article" && item.doi) {
      return "DOI: " + item.doi + "\n";
    }
    return "";
  }

  // Function to extract lean DOI
  function doilean(doi) {
    if (doi) {
      return doi.replace("https://doi.org/", "");
    }
    return "";
  }

  // Function to convert abstract_inverted_index to abstract
  function absInvert(index) {
    return Object.entries(index)
      .map(([key, value]) => ({ key, value: value[0] }))
      .sort((a, b) => a.value - b.value)
      .map((item) => item.key)
      .join(" ");
  }

  let results = JSON.parse(data);
  if (data.results)
    results = data.results;

  const returns = results.map((item) => {
    const zoteroItem = {
      itemType: typeMap(item.type),
      title: item.title,
      creators: item.authorships.map((authorship) => ({
        creatorType: "author",
        firstName: authorship.author.display_name.split(" ").slice(0, -1).join(" "),
        lastName: authorship.author.display_name.split(" ").pop(),
      })),
      abstractNote: item.abstract_inverted_index ? absInvert(item.abstract_inverted_index) : "",
      date: item.publication_date,
      language: "",
      shortTitle: "",
      url: item.primary_location?.landing_page_url || "",
      accessDate: "",
      archive: "",
      archiveLocation: "",
      libraryCatalog: "",
      callNumber: openalexCode(item.ids.openalex),
      rights: "",
      extra: showDOIInExtra(item) + openalexCode(item.ids.openalex) + magCode(item.ids.mag) + "\n",
      tags: [{ tag: "openalex:import" }],
      collections: [],
      relations: {},
    };

    // Add type-specific fields
    if (zoteroItem.itemType === "journalArticle") {
      zoteroItem.publicationTitle = item.primary_location?.source?.display_name || "";
      zoteroItem.seriesText = "";
      zoteroItem.volume = item.biblio.volume || "";
      zoteroItem.issue = item.biblio.issue || "";
      zoteroItem.pages = item.biblio.first_page
        ? item.biblio.last_page
          ? item.biblio.first_page + "-" + item.biblio.last_page
          : item.biblio.first_page
        : "";
      zoteroItem.series = "";
      zoteroItem.seriesTitle = "";
      zoteroItem.journalAbbreviation = "";
      zoteroItem.DOI = doilean(item.doi) || "";
      zoteroItem.ISSN = item.primary_location?.source?.issn_l || "";
    } else {
      // Assuming report type
      zoteroItem.reportNumber = "";
      zoteroItem.reportType = "";
      zoteroItem.place = "";
      zoteroItem.institution = "";
      zoteroItem.seriesTitle = "";
    }

    return zoteroItem;
  });
  return JSON.stringify(returns);
}

module.exports = openalexToZotero;
