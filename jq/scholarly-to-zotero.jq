# Map types from scholarly to zotero
def typeMap: 
  if (.=="" or . == null) 
  then "report" 
  else 
    if . == "article" 
    then "journalArticle" 
    else "report" 
    end
  end;
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
  "itemType": (.bib.pub_type | typeMap),
  "title": .bib.title,
  "creators": (if (.bib.author | type) == "array" then [ .bib.author[] | 
    {
      "creatorType": "author",
      "firstName": (. | split(" ")[0:-1]) | join(" "),
      "lastName": (. | split(" ")[-1])
    }
  ] else [.bib.author | split(" and ") | map({ 
      "creatorType": "author", 
      "firstName": (split(", ")[1] // ""), 
      "lastName": (split(", ")[0] // "") 
    })] end),
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
  "extra": ("gsrank: "+ (.gsrank | tostring) + "\n" 
  + "pub_url:" + .pub_url + "\n"
  + "author_id:" + (.author_id | join(",") | tostring) + "\n"
  + "url_scholarbib:" + "https://scholar.google.com"+.url_scholarbib + "\n"
  + "url_add_sclib:" + .url_add_sclib + "\n"
  + "num_citations:" + (.num_citations | tostring) + "\n"
  + "citedby_url:" + .citedby_url + "\n"
  + "url_related_articles:" + .url_related_articles + "\n"
  + "eprint_url:" + .eprint_url + "\n"
  ),
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
