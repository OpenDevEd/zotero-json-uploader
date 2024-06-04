# Consider normalizedTypes

.results | [ .[] | (
  {
    "itemType": "journalArticle",
    "title": .title,
    "creators": [.authors[] | {
      "creatorType": "author",
      "firstName": .authorName | split(" ")[0],
      "lastName": .authorName | split(" ")[1:] | join(" "),
    }],
    "abstractNote": .abstract,
    "date": .date,
    "language": "",
    "shortTitle": "",
    "url": ("https://doi.org/" + (.doi // "")),
    "accessDate": "",
    "archive": "",
    "archiveLocation": "",
    "libraryCatalog": "",
    "callNumber": (.id // "") | ("scite:" + .),
    "rights": "",
    "extra": (
      "id: scite:" + (.id // "") + "\n"
      + "doi: " + (.doi // "") + "\n"
    ),
    "tags": [{
      "tag": "scite:import",
    }],
    "collections": [],
    "relations": {},
  }
  # TODO: Consider normalizedTypes
  + (if 1 then
    {
      "publicationTitle": "",
      "volume": (.volume // ""),
      "issue": "",
      "pages": "",
      "DOI": (.doi // ""),
      "ISSN": (.issns[0] // ""),
      "journalAbbreviation": "",
      "seriesText": "",
      "series": "",
      "seriesTitle": "",
    }
  else 
  {
    "reportNumber": "",
    "reportType": "",
    "place": "",
    "institution": "",
    "seriesTitle": ""
  } 
  end)
)]