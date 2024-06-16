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
    } else if (json.meta.source == "WebOfScience") {
      return "wos";
    } else if (json.meta.source == "BritishEducationIndex") {
      return "bei";
    }
  }
  return "unknown";
}

module.exports = detectJsonSource;
