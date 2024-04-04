/* eslint-disable camelcase*/
var PDFversionMap = {
	submittedVersion: "Submitted Version PDF",
	acceptedVersion: "Accepted Version PDF",
	publishedVersion: "Full Text PDF"
};
/* eslint-disable camelcase*/
var mappingTypes = {
	article: "journalArticle",
	book: "book",
	"book-chapter": "bookSection",
	dissertation: "thesis",
	other: "document",
	report: "report",
	paratext: "document",
	dataset: "dataset",
	"reference-entry": "encyclopediaArticle",
	standard: "standard",
	editorial: "journalArticle",
	letter: "journalArticle",
	"peer-review": "document", // up for debate
	erratum: "journalArticle",
	grant: "manuscript" // up for debate
};

function openalexToZotero(json, isSDGS = false) {
  let returns = [];
  const data = JSON.parse(json);
  if (data.ids) {
		returns.push(parseIndividual(data));
	}
  else if (isSDGS) {
    let results = data;
    console.log(results.length);
    for (let result of results) {
      returns.push(parseIndividual(result));
    }
  }
	else {
		let results = data.results;
		for (let result of results) {
			returns.push(parseIndividual(result));
		}
	}
  return JSON.stringify(returns);
}

function cleanDOI(doi) {
  if (doi !== "" && doi !== null) {
    return doi.replace("https://doi.org/", "");
  } else {
    return "";
  }
}

function capitalizeTitle(title, preserveCase) {
  if (preserveCase) {
    return title.replace(/\b\w+/g, function(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
  } else {
    return title.toUpperCase();
  }
}

function parseIndividual(data) {
	let OAtype = data.type || "document";

	var item = {};
	item.type = mappingTypes[OAtype] || "document";
	item.title = data.title;
	// fix all caps titles
	if (item.title == item.title.toUpperCase()) {
	  item.title = capitalizeTitle(item.title, true);
	}
	item.date = data.publication_date;
	item.language = data.language;
	if (data.doi) {
		item.DOI = cleanDOI(data.doi);
	}
  
  if (data.primary_location) {	
    if (data.primary_location.source) {
      let sourceName = data.primary_location.source.display_name;
      if (item.itemType == "thesis" || item.itemType == "dataset") {
        item.publisher = sourceName;
      }
      else if (item.itemType == "book") {
        item.publisher = data.primary_location.source.host_organization_name;
      }
      else {
        item.publicationTitle = sourceName;
        item.publisher = data.primary_location.source.host_organization_name;
      }
      item.ISSN = data.primary_location.source.issn;
    }
  }

  if (data.biblio) {
    let biblio = data.biblio;
    item.issue = biblio.issue;
    item.volume = biblio.volume;
    if (biblio.first_page && biblio.last_page && biblio.first_page != biblio.last_page) {
      item.pages = biblio.first_page + "-" + biblio.last_page;
    }
    else if (biblio.first_page) {
      item.pages = biblio.first_page;
    }
  }

	if (data.authorships) {
    let authors = data.authorships;
    item.creators = [];
    for (let author of authors) {
      let authorName = author.author.display_name;
      item.creators.push(cleanAuthor(authorName));
    }
    if (item.itemType == "thesis" && !item.publisher & authors.length) {
      // use author affiliation as university
      item.university = authors[0].raw_affiliation_string;
    }
  }
	if (data.best_oa_location && data.best_oa_location.pdf_url) {
    let version = "Submitted Version PDF";
		if (data.best_oa_location.version) {
      version = PDFversionMap[data.best_oa_location.version];
		}
    item.attachments = [];
		item.attachments.push({ url: data.best_oa_location.pdf_url, title: version, mimeType: "application/pdf" });
	}
	if (data.keywords) {
    let tags = data.keywords;
    item.tags = [];
    for (let tag of tags) {
      item.tags.push(tag.keyword);
    }
  }
  item.extra = "openalex: " + data.ids.openalex;
  return item;
}

function cleanAuthor(authorName) {
  const firstName = authorName.split(" ").slice(0, -1).join(" ");
  const lastName = authorName.split(" ").slice(-1)[0];

  return {
    creatorType: "author",
    firstName: firstName,
    lastName: lastName
  };
}

module.exports = openalexToZotero;
