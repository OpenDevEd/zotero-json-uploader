function detectJsonSource(json) {
  if (json) {
    if (json.meta.source == "Scopus") {
      return "scopus";
    } else if (json.meta.source == "OpenAlex") {
      return "openalex";
    } else if (json.meta.source == "Google Scholar") {
      return "scholarly";
    } else if (json.meta.source == "Scite") {
      return "scite";
    }
  }
  return "unknown";
}

module.exports = detectJsonSource;
