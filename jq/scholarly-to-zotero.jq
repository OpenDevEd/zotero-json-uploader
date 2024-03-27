# Map types from openalex to zotero
def typeMap: if . == "article" then "journalArticle" else "report" end;
#
def openalexCode: if ((.!=null) and (. | split("/")[-1]) != "") then ("openalex: "+(. | split("/")[-1])+"\n") else "" end;
def magCode: if ((. != "") and (. != null)) then ("mag: "+(.)) else "" end;
# Determine whether the doi should be put into the Zotero extra field
def showDOIInExtra: if ((.type != "article") and (.doi != "") and (.doi != null)) then ("DOI: "+ .doi + "\n") else "" end;
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
  "date": .publication_date,
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
  "extra": (extractDOI(.pub_url) // ""),
  "tags": [{
      "tag": "scholarly:import"
    }],
  "collections": ["DUMMY_IMPORT_COLLECTION"],
  "relations": {}
} 
# Zotero has fields that are only valid for certain types. Handle those specific fields.
# Extra fields for Zotero-type journalArticle
# + (if (.type | typeMap) == "journalArticle" then {
#   "publicationTitle": (.primary_location.source.display_name // ""),
#   "seriesText": "",
#   "volume": (.biblio.volume // ""),
#   "issue": (.biblio.issue // ""),
#   "pages": (.biblio | (if (.first_page != "") then (if (.last_page != "") then (.first_page+"-"+.last_page) else .first_page end) else "" end)),
#   "series": "",
#   "seriesTitle": "",
#   "journalAbbreviation": "",
#   "DOI": ((.doi|doilean) // ""),
#   "ISSN": (.primary_location.source.issn_l // "")
# } else 
# # Extra fields for Zotero-type report:
# {
#   "reportNumber": "",
#   "reportType": "",
#   "place": "",
#   "institution": "",
#   "seriesTitle": ""
# }
# end)
)]
