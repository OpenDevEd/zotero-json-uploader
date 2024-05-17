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
    if (scopusSpecificFields.some((field) => json[field])) {
      return "scopus";
    } else if (openalexSpecificFields.some((field) => json[field])) {
      return "openalex";
    } else if (scholarlySpecificFields.some((field) => json[field])) {
      return "scholarly";
    }
  }
  return "unknown";
}

module.exports = detectJsonSource;
