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
    "itemType": ."subtypeDescription" | typeMap,
    "title": ."dc:title",
    "creators": (if has("author") and (.author | type) == "array" then 
    # TODO: handle multiple authors when get the access to the data
    [ .author | .[] | {
        "creatorType": "author",
        "firstName": ."given-name",
        "lastName": .surname
      }
    ]
     else
      (if has("dc:creator") and (."dc:creator" | type) == "string" then
        [ ."dc:creator" | {
            "creatorType": "author",
            "firstName": . | split(" ")[0],
            "lastName": . | split(" ")[1]
          }
        ]
      else
        [] end)
      end),
    "abstractNote": (."dc:description" // ""),
    "date": ."prism:coverDate",
    "language": "",
    "shortTitle": "",
    "url": ."prism:url",
    "accessDate": "",
    "archive": "",
    "archiveLocation": "",
    "libraryCatalog": "",
    "callNumber": "",
    "rights": "",
    "extra": ((
      if has("affiliation") and (.affiliation | type) == "array" then
      "affiliation: " + (.affiliation | showAffiliationInExtra) + "\n"
      else
      "affiliation: " + (.affiliation // "") + "\n"
      end
      )
      + "pubitemid: " + (.pii // "") + "\n"
      + "eid: " + (.eid // "") + "\n"
      + "orcid: " + (.orcid // "") + "\n"
      + "openaccess: " + (.openaccess // "") + "\n"
      + "id: scopus:" + (."dc:identifier" | split(":")[1] // "") + "\n"
      ),
    "tags": [{
      "tag": "scopus:import",
    }],
    "collections": [],
    "relations": {},
  }
  + (if (.subtypeDescription | typeMap) == "journalArticle" then
    {
      "publicationTitle": ."prism:publicationName",
      "volume": (."prism:volume" // ""),
      "issue": (."prism:issueIdentifier" // ""),
      "pages": (."prism:pageRange" // ""),
      "DOI": (."prism:doi" // ""),
      "ISSN": (."prism:issn" // ."prism:eIssn" // ""),
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