.results | [ .[] | (
  {
    "itemType": "journalArticle",
    "title": .TI,
    "creators": [.AU[] | {
      "creatorType": "author",
      "firstName": . | split(" ")[0],
      "lastName": . | split(" ")[1:] | join(" "),
    }],
    "abstractNote": .AB,
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
      "id: scite:" + (.AN[0] // "") + "\n"
      + "doi: " + (.DO[0] // "") + "\n"
    ),
    "tags": [{
      "tag": "wos:import",
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