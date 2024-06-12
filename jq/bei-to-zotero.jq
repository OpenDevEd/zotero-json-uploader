.results | [ .[] | (
  {
    "itemType": "journalArticle",
    "title": .T1,
    "creators": (if .AU then
      [.AU[] | {
      "creatorType": "author",
      "firstName": . | split(" ")[0],
      "lastName": . | split(" ")[1:] | join(" "),
      }]
    else
      []
    end),
    "abstractNote": .AB,
    "date": .Y1,
    "language": "",
    "shortTitle": "",
    "url": ("https://doi.org/" + (.L3[0] // "")),
    "accessDate": "",
    "archive": "",
    "archiveLocation": "",
    "libraryCatalog": "",
    "callNumber":((.UR[0] | capture("AN=(?<id>\\d+)")) | .id) | ("bei:" + .),
    "rights": "",
    "extra": (
      "id: bei:" +((.UR[0] | capture("AN=(?<id>\\d+)")) | .id) + "\n"
      + "doi: " + (.L3[0] // "") + "\n"
    ),
    "tags": [{
      "tag": "BritishEducationIndex:import",
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
      "DOI": (.L3[0] // ""),
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