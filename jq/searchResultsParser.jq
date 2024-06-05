def parseExtraToObj(extra):
  if extra == null then
    {}
  else
    extra
    | split("\n")
    | map(select(length > 0))
    | map(split(": ") | {(.[0] // ""): (.[1] // "")})
    | add
    | del(.[""])
  end;

def parseSearchResults:
  . as $data |
  if ($data.results == null or ($data.results | length) == 0) then 
    error("No search results to parse")
  else
    $data
  end |
  if ($data.meta == null) then
    error("No metadata found")
  else
    $data
  end |
  {
    meta: .meta,
    results: (.results | to_entries | map(
      {
        title: (.value.title // ""),
        abstract: (.value.abstractNote // ""),
        keywords: ((parseExtraToObj(.value.extra).keywords // "") | split(", ") | map(select(length > 0)) |  join(";")),
        doi: (.value.DOI // ""),
        sourceDatabase: ($data.meta.source // ""),
        identifierInSource: (.value.callNumber // ""),
        originalJson: (.value | tojson),
        itemPositionWithinSearch: .key,
        searchId: ($data.meta.searchID // "")
      }
    ))
  };

parseSearchResults
