function detectJsonSource(json) {
  const scopusSpecificFields = ["search-results"];
  const openalexSpecificFields = ["meta", "group_by"];
  const scholarlySpecificFields = [
    "time_start",
    "args",
    "timestamp",
    "total_results",
    "time_end",
  ];

  if (json) {
    if (json.meta.source == "Scopus") {
      return "scopus";
    } else if (json.meta.source == "OpenAlex") {
      return "openalex";
    } else if (json.meta.source == "Google Scholar") {
      return "scholarly";
    }
  }
  return "unknown";
}

module.exports = detectJsonSource;
