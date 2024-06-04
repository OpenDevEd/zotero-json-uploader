def typeMap:
  if (.=="" or .==null)
    then "report"
  else
    if . == "article" or . == "Article"
      then "journalArticle"
    else "report"
    end
  end;

def objectToString:
  tojson | gsub("\""; "") ;

def arrayToString:
  . | map(objectToString) | join(", ");

def showAffiliationInExtra:
   . | arrayToString;


.results | [ .[] | (
  {
    "itemType": ."",
    "title": .title,
    "creators": .authors[] | {
      "creatorType": "author",
      "firstName": .authorName | split(" ")[0],
      "lastName": .authorName | split(" ")[1:],
    },
    "abstractNote": .abstract,
    "date": .date,
    "language": "",
    "shortTitle": "",
    "url": "",
    "accessDate": "",
    "archive": "",
    "archiveLocation": "",
    "libraryCatalog": "",
    "callNumber": .id | ("scite:" + .),
    "rights": "",
    "extra": (
      "id: " + .id
    ),
    "tags": [{
      "tag": "scite:import",
    }],
    "collections": [],
    "relations": {},
  }
  + (if (.subtypeDescription | typeMap) == "journalArticle" then
    {
      "publicationTitle": "",
      "volume": "",
      "issue": "",
      "pages": "",
      "DOI": "",
      "ISSN": "",
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