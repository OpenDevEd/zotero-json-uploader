.results | [ .[] | (
  {
    "itemType": "journalArticle",
    "title": .TI,
    "creators": [.AU[] | {
      "creatorType": "author",
      "firstName": . | split(" ")[0],
      "lastName": . | split(" ")[1:] | join(" "),
    }],
    "abstractNote": .AB[0],
    "date": .PY,
    "language": "",
    "shortTitle": "",
    "url": ("https://doi.org/" + (.DO[0] // "")),
    "accessDate": "",
    "archive": "",
    "archiveLocation": "",
    "libraryCatalog": "",
    "callNumber": (.AN[0] // "") | ("wos:" + .),
    "rights": "",
    "extra": (
      "id: wos:" + (.AN[0] // "") + "\n"
      + "doi: " + (.DO[0] // "") + "\n"
    ),
    "tags": [{
      "tag": "WebOfScience:import",
    }],
    "collections": [],
    "relations": {},
  }
  + (if 1 then
    {
      "publicationTitle": "",
      "volume": (.VL // ""),
      "issue": "",
      "pages": ((.SP // "") + "-" + (.EP // "")),
      "DOI": (.DO[0] // ""),
      "ISSN": (.SN[0] // ""),
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