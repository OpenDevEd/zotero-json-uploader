# Map types from openalex to zotero
def typeMap: if . == "article" then "journalArticle" else "report" end;
#
def openalexCode: if ((.!=null) and (. | split("/")[-1]) != "") then ("openalex: "+(. | split("/")[-1])+"\n") else "" end;
def magCode: if ((. != "") and (. != null)) then ("mag: "+(.)) else "" end;
# Determine whether the doi should be put into the Zotero extra field
def showDOIInExtra: if ((.type != "Publication") and (.doi != "") and (.doi != null)) then ("DOI: "+ .doi + "\n") else "" end;
def doilean: if (.!="" and . != null) then (.|sub("https://doi.org/";"")) else "" end;
# Turn abstract_inverted_index into abstract:
def absInvert: [[ . | to_entries | .[] | { key: .key, value: .value | .[] } ] | sort_by(.value) | .[] | .key] | join(" ");
# Function to extract DOI from URL
def extractDOI(url):
  if url == null then "" else
    if (url | contains("doi"))
    then (url | split("&") | map(select(contains("identifierValue"))) | .[0] | split("=") | ("DOI: " +.[1]+ "\n"))
    else ""
    end
  end;


.results | [ .[] | (
# handle fields common to all zotero record types (journalArticle, report, book ...)
{
  "itemType": (.container_type | typeMap),
  "title": .bib.title,
  "creators": [ .bib.author[] | 
    {
      "creatorType": "author",
      "firstName": (. | split(" ")[0:-1]) | join(" "),
      "lastName": (. | split(" ")[-1])
    }
  ]
  ,
  "abstractNote": (.bib.abstract // ""),
  "date": .bib.pub_year,
  "language": "",
  "shortTitle": "",
  "url": (.pub_url // ""),
  "accessDate": "",
  "archive": "",
  "archiveLocation": "",
  "libraryCatalog": "",
  # "callNumber": (. | tostring),
  "callNumber": "",
  "rights": "",
  "extra": (extractDOI(.pub_url)),
  "tags": [{
      "tag": "scholarly:import"
    }],
  "collections": ["DUMMY_IMPORT_COLLECTION"],
  "relations": {}
} 
# Zotero has fields that are only valid for certain types. Handle those specific fields.
# Extra fields for Zotero-type journalArticle
+ (if (.container_type | typeMap) == "journalArticle" then {
  "publicationTitle": "",
  "seriesText": "",
  "volume": "",
  "issue": "",
  "pages": "",
  "series": "",
  "seriesTitle": "",
  "journalAbbreviation": "",
  "DOI": ((extractDOI(.pub_url))),
  "ISSN": "",
} else 
# Extra fields for Zotero-type report:
{
  "reportNumber": "",
  "reportType": "",
  "place": "",
  "institution": "",
  "seriesTitle": ""
}
end)
)]
